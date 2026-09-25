import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { recommendAPI, weatherAPI, getImageUrl } from '../services/api';
import {
  Sparkles, RefreshCw, Heart, Check, Sun, Cloud, CloudRain, Snowflake,
  Briefcase, GraduationCap, PartyPopper, Coffee, Star, MapPin, Thermometer
} from 'lucide-react';
import toast from 'react-hot-toast';
import './DailyTop5.css';

const OCCASIONS = [
  { value: 'casual', label: 'Casual', icon: Coffee },
  { value: 'college', label: 'College', icon: GraduationCap },
  { value: 'office', label: 'Office', icon: Briefcase },
  { value: 'party', label: 'Party', icon: PartyPopper },
];

const WEATHERS = [
  { value: 'normal', label: 'Normal', icon: Sun },
  { value: 'hot', label: 'Hot', icon: Sun },
  { value: 'cold', label: 'Cold', icon: Snowflake },
  { value: 'rainy', label: 'Rainy', icon: CloudRain },
];

export default function DailyTop5() {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [occasion, setOccasion] = useState(user?.preferences?.defaultOccasion || 'casual');
  const [weather, setWeather] = useState('normal');
  const [weatherDetails, setWeatherDetails] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWeatherAndRecommendations();
  }, []);

  const fetchWeatherAndRecommendations = async () => {
    // Auto-detect weather first
    setWeatherLoading(true);
    try {
      const { data } = await weatherAPI.getCurrent();
      setWeather(data.weather);
      setWeatherDetails(data.details);
    } catch (err) {
      console.log('Weather fetch error, using default');
    } finally {
      setWeatherLoading(false);
    }

    // Then load recommendations
    loadRecommendations();
  };

  const loadRecommendations = async (occ, wth) => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await recommendAPI.getDailyTop5({
        occasion: occ || occasion,
        weather: wth || weather
      });
      setOutfits(data.outfits || []);
      if (data.message) setMessage(data.message);
      if (data.outfits?.length > 0) {
        toast.success(`Found ${data.outfits.length} outfit${data.outfits.length > 1 ? 's' : ''} for you!`);
      }
    } catch (err) {
      toast.error('Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleOccasionChange = (val) => {
    setOccasion(val);
    loadRecommendations(val, weather);
  };

  const handleWeatherChange = (val) => {
    setWeather(val);
    loadRecommendations(occasion, val);
  };

  const handleMarkWorn = async (outfit) => {
    try {
      await recommendAPI.markAsWorn({
        topId: outfit.top?._id,
        bottomId: outfit.bottom?._id,
        shoesId: outfit.shoes?._id,
        bagId: outfit.bag?._id,
        occasion: outfit.occasion,
        weather: outfit.weather,
        score: outfit.score
      });
      toast.success('Outfit marked as worn!');
    } catch (err) {
      toast.error('Failed to mark as worn');
    }
  };

  const handleSaveFavorite = async (outfit) => {
    try {
      await recommendAPI.saveFavorite({
        topId: outfit.top?._id,
        bottomId: outfit.bottom?._id,
        shoesId: outfit.shoes?._id,
        bagId: outfit.bag?._id,
        occasion: outfit.occasion,
        weather: outfit.weather,
        score: outfit.score
      });
      toast.success('Saved to favorites!');
    } catch (err) {
      toast.error('Failed to save favorite');
    }
  };

  return (
    <div className="daily-page animate-fadeIn">
      {/* Header */}
      <div className="page-top">
        <div>
          <h1>
            <Sparkles size={24} className="header-icon" />
            Daily Top 5 Outfits
          </h1>
          <p>AI-powered outfit recommendations for your day</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => loadRecommendations()}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'spin-anim' : ''} />
          Refresh
        </button>
      </div>

      {/* Auto Weather Banner */}
      {weatherDetails && (
        <div className="weather-banner">
          <div className="weather-main">
            <span className="weather-icon-large">{weatherDetails.icon}</span>
            <div>
              <div className="weather-temp">
                <Thermometer size={16} />
                <strong>{weatherDetails.temperature}°C</strong>
                <span className="weather-desc">{weatherDetails.description}</span>
              </div>
              {weatherDetails.city && (
                <div className="weather-location">
                  <MapPin size={13} />
                  <span>{weatherDetails.city}{weatherDetails.region ? `, ${weatherDetails.region}` : ''}</span>
                </div>
              )}
            </div>
          </div>
          <div className="weather-auto-badge">
            <Cloud size={14} />
            Auto-detected: <strong>{weather}</strong>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls-bar">
        <div className="control-group">
          <label>Occasion</label>
          <div className="control-options">
            {OCCASIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={`control-chip ${occasion === value ? 'control-chip--active' : ''}`}
                onClick={() => handleOccasionChange(value)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Weather {weatherDetails ? '(auto-detected)' : ''}</label>
          <div className="control-options">
            {WEATHERS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={`control-chip ${weather === value ? 'control-chip--active' : ''}`}
                onClick={() => handleWeatherChange(value)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>AI is finding your best outfits...</span>
        </div>
      ) : outfits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Sparkles size={36} />
          </div>
          <h3>{message || 'No outfits available'}</h3>
          <p>Add more items to your wardrobe (at least 1 top, 1 bottom, 1 shoes) to get personalized outfit recommendations.</p>
        </div>
      ) : (
        <div className="outfits-list">
          {outfits.map((outfit, idx) => (
            <div key={idx} className="outfit-card" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="outfit-rank">
                <Star size={16} />
                <span>#{outfit.rank || idx + 1}</span>
              </div>

              <div className="outfit-items">
                <OutfitImage item={outfit.top} label="Top" />
                <OutfitImage item={outfit.bottom} label="Bottom" />
                <OutfitImage item={outfit.shoes} label="Shoes" />
                {outfit.bag && <OutfitImage item={outfit.bag} label="Bag" />}
              </div>

              <div className="outfit-info">
                <div className="outfit-score">
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{ width: `${Math.min((outfit.score || 0) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="score-value">{((outfit.score || 0) * 100).toFixed(0)}%</span>
                </div>
                <p className="outfit-reason">{outfit.reason}</p>
                <div className="outfit-tags">
                  <span className="badge badge-teal">{outfit.occasion}</span>
                  <span className="badge badge-success">{outfit.weather}</span>
                </div>
              </div>

              <div className="outfit-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => handleMarkWorn(outfit)}>
                  <Check size={16} /> Worn
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleSaveFavorite(outfit)}>
                  <Heart size={16} /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OutfitImage({ item, label }) {
  if (!item) return null;
  return (
    <div className="outfit-item-card">
      <img
        src={getImageUrl(item.imageUrl)}
        alt={label}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.background = '#1a2332';
          e.target.style.objectFit = 'contain';
        }}
      />
      <span className="item-label">{label}</span>
    </div>
  );
}
