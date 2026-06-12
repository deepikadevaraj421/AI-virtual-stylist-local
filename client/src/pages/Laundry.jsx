import { useState, useEffect } from 'react';
import { wardrobeAPI } from '../services/api';
import { RefreshCw, Trash2, Droplets, ShoppingBasket, CheckCircle2, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import './Laundry.css';

export default function Laundry() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWashing, setIsWashing] = useState(false);

  useEffect(() => {
    loadLaundry();
  }, []);

  const loadLaundry = async () => {
    try {
      setLoading(true);
      const { data } = await wardrobeAPI.getLaundry();
      setItems(data);
    } catch (err) {
      toast.error('Failed to load laundry basket');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (id, date) => {
    try {
      await wardrobeAPI.scheduleLaundry(id, date);
      toast.success('Laundry return scheduled!');
      loadLaundry();
    } catch (err) {
      toast.error('Failed to schedule laundry');
    }
  };

  const handleWashItem = async (id) => {
    try {
      await wardrobeAPI.clearLaundryItem(id);
      toast.success('Item is clean and back in wardrobe!');
      setItems(items.filter(item => item._id !== id));
    } catch (err) {
      toast.error('Failed to wash item');
    }
  };

  const handleWashAll = async () => {
    if (!window.confirm('Wash all items in the laundry basket?')) return;
    
    try {
      setIsWashing(true);
      await wardrobeAPI.clearAllLaundry();
      toast.success('All items are now clean!');
      setItems([]);
    } catch (err) {
      toast.error('Failed to clear laundry');
    } finally {
      setIsWashing(false);
    }
  };

  return (
    <div className="laundry-page animate-fadeIn">
      <div className="laundry-header">
        <div>
          <h1>Laundry Basket</h1>
          <p>{items.length} items waiting to be cleaned</p>
        </div>
        {items.length > 0 && (
          <button 
            className="btn btn-primary" 
            onClick={handleWashAll}
            disabled={isWashing}
          >
            {isWashing ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <Droplets size={18} />
            )}
            Wash Everything
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Checking laundry basket...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="laundry-empty">
          <div className="laundry-empty-icon">
            <CheckCircle2 size={40} />
          </div>
          <h3>Everything is Clean!</h3>
          <p>Your laundry basket is empty. All your favorite clothes are ready to wear in your wardrobe.</p>
          <button className="btn btn-secondary" onClick={() => window.location.href='/dashboard/wardrobe'}>
            Go to Wardrobe
          </button>
        </div>
      ) : (
        <div className="laundry-grid">
          {items.map((item, idx) => (
            <div 
              key={item._id} 
              className="laundry-card"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="laundry-card-image">
                <div className="laundry-badge-overlay">In Laundry</div>
                <img src={item.imageUrl} alt={item.category} />
                <div className="laundry-overlay">
                  <button className="wash-btn" onClick={() => handleWashItem(item._id)}>
                    <RefreshCw size={18} />
                    Wash
                  </button>
                </div>
              </div>
              <div className="laundry-card-body">
                <div className="laundry-card-meta">
                  <span className="badge badge-teal">{item.category}</span>
                  <span className="badge badge-success">{item.gender}</span>
                </div>
                
                {item.laundryReadyAt && (
                  <div className="laundry-ready-info" style={{ color: '#3b82f6', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    Ready: {new Date(item.laundryReadyAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div className="card-color" style={{ fontSize: '0.85rem', flex: 1 }}>
                    <div className="color-dot" style={{ 
                      background: item.color === 'white' ? '#f1f5f9' : item.color,
                      width: 10, height: 10
                    }} />
                    <span>{item.color}</span>
                  </div>
                  <input 
                    type="datetime-local" 
                    className="schedule-input"
                    onChange={(e) => handleSchedule(item._id, e.target.value)}
                    style={{ fontSize: '0.7rem', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
