import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { weeklyAPI } from '../services/api';
import {
  Calendar, RefreshCw, WashingMachine, Check, Edit3, X, Sparkles,
  Sun, Cloud, CloudRain, Snowflake
} from 'lucide-react';
import toast from 'react-hot-toast';
import './WeeklyPlan.css';

const OCCASIONS = ['casual', 'college', 'office', 'party'];
const WEATHERS = ['normal', 'hot', 'cold', 'rainy'];

const weatherIcons = {
  normal: Sun,
  hot: Sun,
  cold: Snowflake,
  rainy: CloudRain
};

export default function WeeklyPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDay, setEditDay] = useState(null);
  const [editOccasion, setEditOccasion] = useState('');
  const [editWeather, setEditWeather] = useState('');

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const { data } = await weeklyAPI.getPlan();
      setPlan(data);
    } catch (err) {
      toast.error('Failed to load weekly plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const { data } = await weeklyAPI.generatePlan();
      setPlan(data);
      toast.success('Weekly plan regenerated!');
    } catch (err) {
      toast.error('Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDay = async () => {
    if (!editDay) return;
    try {
      const { data } = await weeklyAPI.updateDay({
        day: editDay,
        occasion: editOccasion,
        weather: editWeather
      });
      setPlan(data);
      setEditDay(null);
      toast.success(`${editDay}'s outfit updated!`);
    } catch (err) {
      toast.error('Failed to update day');
    }
  };

  const handleMarkWorn = async (day) => {
    try {
      const { data } = await weeklyAPI.markDayWorn({ day });
      setPlan(data);
      toast.success(`${day}'s outfit marked as worn`);
    } catch (err) {
      toast.error('Failed to mark as worn');
    }
  };

  const handleLaundry = async () => {
    try {
      const { data } = await weeklyAPI.completeLaundry();
      if (data.plan) setPlan(data.plan);
      toast.success('Laundry completed! All items available again.');
    } catch (err) {
      toast.error('Failed to complete laundry');
    }
  };

  const openEdit = (dayData) => {
    setEditDay(dayData.day);
    setEditOccasion(dayData.occasion || 'casual');
    setEditWeather(dayData.weather || 'normal');
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="weekly-page animate-fadeIn">
      {/* Header */}
      <div className="page-top">
        <div>
          <h1>
            <Calendar size={24} className="header-icon" />
            Weekly Plan
          </h1>
          <p>Your outfit plan for the week</p>
        </div>
        <div className="page-top-actions">
          <button className="btn btn-secondary" onClick={handleLaundry}>
            <WashingMachine size={18} />
            Laundry Done
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin-anim' : ''} />
            Regenerate
          </button>
        </div>
      </div>

      {/* Laundry Status */}
      {plan && (
        <div className={`laundry-status ${plan.laundryStatus === 'completed' ? 'laundry-done' : 'laundry-pending'}`}>
          <WashingMachine size={18} />
          <span>
            Laundry: <strong>{plan.laundryStatus === 'completed' ? 'Completed' : 'Pending'}</strong>
            {plan.laundryCompletedAt && (
              <> — Last done: {new Date(plan.laundryCompletedAt).toLocaleDateString()}</>
            )}
          </span>
        </div>
      )}

      {/* Weekly Grid */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Generating your weekly plan...</span>
        </div>
      ) : !plan || !plan.days || plan.days.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Calendar size={36} />
          </div>
          <h3>No weekly plan yet</h3>
          <p>Add items to your wardrobe and click "Regenerate" to create your weekly plan.</p>
          <button className="btn btn-primary" onClick={handleGenerate}>
            <Sparkles size={18} />
            Generate Plan
          </button>
        </div>
      ) : (
        <div className="weekly-grid">
          {plan.days.map((dayData, idx) => {
            const WeatherIcon = weatherIcons[dayData.weather] || Sun;
            const isToday = dayData.day === today;

            return (
              <div
                key={dayData.day}
                className={`day-card ${isToday ? 'day-card--today' : ''} ${dayData.status === 'worn' ? 'day-card--worn' : ''} ${dayData.status === 'empty' ? 'day-card--empty' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="day-header">
                  <div className="day-name-row">
                    <h3>{dayData.day}</h3>
                    {isToday && <span className="today-badge">Today</span>}
                  </div>
                  <div className="day-meta">
                    <span className="badge badge-teal">{dayData.occasion}</span>
                    <span className="day-weather">
                      <WeatherIcon size={14} />
                      {dayData.weather}
                    </span>
                  </div>
                </div>

                {dayData.status === 'empty' || !dayData.top ? (
                  <div className="day-empty">
                    <p>{dayData.reason || 'No outfit available'}</p>
                  </div>
                ) : (
                  <div className="day-outfit">
                    <div className="day-outfit-images">
                      <DayOutfitImg item={dayData.top} label="Top" />
                      <DayOutfitImg item={dayData.bottom} label="Bottom" />
                      <DayOutfitImg item={dayData.shoes} label="Shoes" />
                      {dayData.bag && <DayOutfitImg item={dayData.bag} label="Bag" />}
                    </div>

                    {dayData.score > 0 && (
                      <div className="day-score">
                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{ width: `${Math.min(dayData.score * 100, 100)}%` }}
                          />
                        </div>
                        <span>{(dayData.score * 100).toFixed(0)}%</span>
                      </div>
                    )}

                    {dayData.reason && (
                      <p className="day-reason">{dayData.reason}</p>
                    )}
                  </div>
                )}

                <div className="day-status-row">
                  {dayData.status === 'worn' ? (
                    <span className="badge badge-success"><Check size={12} /> Worn</span>
                  ) : (
                    <div className="day-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dayData)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      {dayData.top && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleMarkWorn(dayData.day)}>
                          <Check size={14} /> Worn
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Day Modal */}
      {editDay && (
        <div className="modal-overlay" onClick={() => setEditDay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Edit {editDay}</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setEditDay(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Occasion</label>
                <select value={editOccasion} onChange={e => setEditOccasion(e.target.value)}>
                  {OCCASIONS.map(o => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Weather</label>
                <select value={editWeather} onChange={e => setEditWeather(e.target.value)}>
                  {WEATHERS.map(w => (
                    <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditDay(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateDay}>
                <RefreshCw size={16} /> Update & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayOutfitImg({ item, label }) {
  if (!item) return null;
  // If item is populated (object), use imageUrl. If it's just an ID (string), we can't show it yet.
  const src = (typeof item === 'object' && item !== null) ? item.imageUrl : '';

  if (!src) return null;

  return (
    <div className="day-img-wrap">
      <img
        src={src}
        alt={label}
        onError={(e) => {
          e.target.style.display = 'none'; // Hide if image fails
        }}
      />
      <span>{label}</span>
    </div>
  );
}
