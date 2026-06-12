import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { User, Save, Calendar, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import './Profile.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const OCCASIONS = ['casual', 'college', 'office', 'party'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [defaultOccasion, setDefaultOccasion] = useState(user?.preferences?.defaultOccasion || 'casual');
  const [defaultWeather, setDefaultWeather] = useState(user?.preferences?.defaultWeather || 'normal');
  const [weeklyTemplate, setWeeklyTemplate] = useState(
    user?.weeklyTemplate || DAYS.map(d => ({
      day: d,
      occasion: ['Saturday'].includes(d) ? 'casual' : d === 'Sunday' ? 'party' : 'college'
    }))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile({
        name,
        preferences: { defaultOccasion, defaultWeather },
        weeklyTemplate
      });
      updateUser(data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const updateTemplateDay = (day, occasion) => {
    setWeeklyTemplate(prev =>
      prev.map(t => t.day === day ? { ...t, occasion } : t)
    );
  };

  return (
    <div className="profile-page animate-fadeIn">
      <div className="page-top">
        <div>
          <h1><User size={24} className="header-icon" /> Profile & Settings</h1>
          <p>Manage your account and preferences</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Profile Info */}
        <div className="profile-section card">
          <div className="section-title">
            <User size={18} />
            <h3>Personal Info</h3>
          </div>

          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h3>{user?.name}</h3>
              <p>{user?.email}</p>
              <span className="badge badge-teal">{user?.gender}</span>
            </div>
          </div>

          <div className="input-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="input-group">
            <label>Email (read-only)</label>
            <input type="email" value={user?.email || ''} disabled />
          </div>

          <div className="input-group">
            <label>Gender (read-only)</label>
            <input type="text" value={user?.gender || ''} disabled style={{ textTransform: 'capitalize' }} />
          </div>
        </div>

        {/* Preferences */}
        <div className="profile-section card">
          <div className="section-title">
            <Settings size={18} />
            <h3>Preferences</h3>
          </div>

          <div className="input-group">
            <label>Default Occasion</label>
            <select value={defaultOccasion} onChange={e => setDefaultOccasion(e.target.value)}>
              {OCCASIONS.map(o => (
                <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Default Weather</label>
            <select value={defaultWeather} onChange={e => setDefaultWeather(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="hot">Hot</option>
              <option value="cold">Cold</option>
              <option value="rainy">Rainy</option>
            </select>
          </div>
        </div>

        {/* Weekly Template */}
        <div className="profile-section card weekly-template-section">
          <div className="section-title">
            <Calendar size={18} />
            <h3>Weekly Template</h3>
          </div>
          <p className="section-desc">Set your default occasion for each day. This is used to generate your weekly plan.</p>

          <div className="template-grid">
            {weeklyTemplate.map(tmpl => (
              <div key={tmpl.day} className="template-row">
                <span className="template-day">{tmpl.day}</span>
                <select
                  value={tmpl.occasion}
                  onChange={e => updateTemplateDay(tmpl.day, e.target.value)}
                >
                  {OCCASIONS.map(o => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="profile-save-bar">
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? (
            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving...</>
          ) : (
            <><Save size={18} /> Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
}
