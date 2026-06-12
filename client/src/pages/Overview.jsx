import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wardrobeAPI, recommendAPI } from '../services/api';
import { Shirt, Footprints, ShoppingBag, Sparkles, Calendar, Heart, TrendingUp, ArrowRight } from 'lucide-react';
import './Overview.css';

export default function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await wardrobeAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryCount = (cat) => {
    if (!stats?.byCategory) return 0;
    const found = stats.byCategory.find(s => s._id === cat);
    return found ? found.count : 0;
  };

  const statCards = [
    { label: 'Total Items', value: stats?.total || 0, icon: ShoppingBag, color: '#2dd4bf' },
    { label: 'Tops', value: getCategoryCount('top'), icon: Shirt, color: '#3b82f6' },
    { label: 'Bottoms', value: getCategoryCount('bottom'), icon: Shirt, color: '#8b5cf6' },
    { label: 'Shoes', value: getCategoryCount('shoes'), icon: Footprints, color: '#f59e0b' },
  ];

  const quickActions = [
    {
      title: 'My Wardrobe',
      description: 'Upload and manage your clothing items',
      icon: Shirt,
      path: '/dashboard/wardrobe',
      gradient: 'linear-gradient(135deg, #0f766e, #115e59)'
    },
    {
      title: 'Daily Top 5',
      description: 'Get AI-powered outfit recommendations',
      icon: Sparkles,
      path: '/dashboard/daily',
      gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)'
    },
    {
      title: 'Weekly Plan',
      description: 'Plan your outfits for the entire week',
      icon: Calendar,
      path: '/dashboard/weekly',
      gradient: 'linear-gradient(135deg, #0284c7, #0369a1)'
    },
    {
      title: 'Profile',
      description: 'Manage your preferences & weekly template',
      icon: Heart,
      path: '/dashboard/profile',
      gradient: 'linear-gradient(135deg, #db2777, #9d174d)'
    },
  ];

  return (
    <div className="overview-page animate-fadeIn">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-badge">
            <TrendingUp size={14} />
            <span>AI-Powered Styling</span>
          </div>
          <h1>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}!
          </h1>
          <p>Welcome to your AI Virtual Stylist dashboard. Start by uploading your wardrobe to get personalized outfit recommendations.</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/wardrobe')}>
            <Shirt size={18} />
            Go to Wardrobe
          </button>
        </div>
        <div className="welcome-graphic">
          <div className="graphic-circle graphic-circle-1" />
          <div className="graphic-circle graphic-circle-2" />
          <div className="graphic-circle graphic-circle-3" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <div key={stat.label} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-icon" style={{ background: `${stat.color}18`, color: stat.color }}>
              <stat.icon size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {loading ? <div className="skeleton" style={{ width: 40, height: 28 }} /> : stat.value}
              </span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="section-header">
        <h2>Quick Actions</h2>
        <p>Jump into any section to get started</p>
      </div>

      <div className="actions-grid">
        {quickActions.map((action, i) => (
          <div
            key={action.title}
            className="action-card"
            onClick={() => navigate(action.path)}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="action-icon" style={{ background: action.gradient }}>
              <action.icon size={24} />
            </div>
            <div className="action-content">
              <h3>{action.title}</h3>
              <p>{action.description}</p>
            </div>
            <ArrowRight size={18} className="action-arrow" />
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="section-header" style={{ marginTop: 12 }}>
        <h2>How It Works</h2>
        <p>Three simple steps to perfect outfits</p>
      </div>

      <div className="steps-grid">
        <div className="step-card">
          <div className="step-number">1</div>
          <h3>Upload Wardrobe</h3>
          <p>Take photos of your clothes or upload from gallery. Our CNN model auto-classifies them.</p>
        </div>
        <div className="step-card">
          <div className="step-number">2</div>
          <h3>Get Recommendations</h3>
          <p>KNN finds matching items, XGBoost scores and ranks the best outfit combinations.</p>
        </div>
        <div className="step-card">
          <div className="step-number">3</div>
          <h3>Plan Your Week</h3>
          <p>Auto-generated weekly outfit plans with smart rotation and laundry tracking.</p>
        </div>
      </div>
    </div>
  );
}
