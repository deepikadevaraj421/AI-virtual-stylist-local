import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { wardrobeAPI } from '../services/api';
import {
  Plus, Upload, X, Trash2, Edit3, Camera, Filter, Image as ImageIcon, Tag, Eye, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Wardrobe.css';

const CATEGORIES = ['all', 'top', 'bottom', 'shoes', 'bag', 'laundry'];
const OCCASIONS = ['all', 'casual', 'office', 'college', 'party'];
const COLORS = ['', 'black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'grey', 'brown', 'navy', 'beige', 'maroon', 'purple', 'orange'];

export default function Wardrobe() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [predicting, setPredicting] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    image: null,
    preview: null,
    category: '',
    gender: user?.gender || 'men',
    color: '',
    occasion: 'all',
    material: '',
    weatherSuitability: ['normal'],
    subCategory: '',
    tags: ''
  });

  useEffect(() => {
    loadItems();
  }, [filter]);

  // Global Paste Listener
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (showUpload) {
        handlePaste(e);
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [showUpload]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') params.category = filter;
      const { data } = await wardrobeAPI.getItems(params);
      setItems(data);
    } catch (err) {
      toast.error('Failed to load wardrobe');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handlePaste = (e) => {
    const file = e.clipboardData.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadForm(prev => ({ ...prev, image: file, preview: reader.result }));
      handlePredict(file);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    processFile(e.target.files[0]);
  };

  const handlePredict = async (file) => {
    try {
      setPredicting(true);
      const formData = new FormData();
      formData.append('image', file);

      const { data } = await wardrobeAPI.predictItem(formData);

      if (data) {
        setUploadForm(prev => ({
          ...prev,
          category: data.category || prev.category,
          subCategory: data.subCategory || prev.subCategory,
          gender: data.gender || prev.gender,
          color: data.color || prev.color,
          material: data.material || prev.material,
          occasion: data.occasion || prev.occasion,
          weatherSuitability: data.weatherSuitability || prev.weatherSuitability,
          imageUrl: data.imageUrl,
        }));
        if (data.fallback) {
          toast('Select category & color manually', {
            icon: '✏️',
            duration: 3500
          });
        } else if (data.category) {
          toast.success(`AI Recognition: ${data.category} detected!`, {
            icon: '🤖',
            duration: 4000
          });
        }
      }
    } catch (err) {
      console.error('Prediction failed:', err);
      toast.error(err.response?.data?.message || 'AI recognition failed. Please select manually.');
    } finally {
      setPredicting(false);
    }
  };

  const openCamera = async () => {
    setShowCamera(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      // Wait for next render so videoRef is mounted
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
          };
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Could not access camera. Please check permissions.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const reader = new FileReader();
        reader.onload = () => {
          setUploadForm(prev => ({ ...prev, image: file, preview: reader.result }));
        };
        reader.readAsDataURL(file);
        closeCamera();
        toast.success('Photo captured!');
      }
    }, 'image/jpeg', 0.92);
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraReady(false);
  };

  const handleUpload = async () => {
    if (!uploadForm.image) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('category', uploadForm.category || 'top');
      formData.append('gender', uploadForm.gender);
      formData.append('color', uploadForm.color);
      formData.append('occasion', uploadForm.occasion);
      formData.append('material', uploadForm.material);
      formData.append('weatherSuitability', JSON.stringify(uploadForm.weatherSuitability));
      formData.append('subCategory', uploadForm.subCategory);
      if (uploadForm.imageUrl) {
        formData.append('imageUrl', uploadForm.imageUrl);
      }
      formData.append('tags', JSON.stringify(
        uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      ));
      // Append image last to ensure all text fields are parsed by multer
      formData.append('image', uploadForm.image);

      await wardrobeAPI.addItem(formData);
      toast.success('Item added to wardrobe!');
      setShowUpload(false);
      resetUploadForm();
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item from your wardrobe?')) return;
    try {
      await wardrobeAPI.deleteItem(id);
      toast.success('Item deleted');
      setItems(items.filter(i => i._id !== id));
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    try {
      await wardrobeAPI.updateItem(editItem._id, {
        category: editItem.category,
        gender: editItem.gender,
        color: editItem.color,
        occasion: editItem.occasion,
        tags: editItem.tags
      });
      toast.success('Item updated');
      setEditItem(null);
      loadItems();
    } catch (err) {
      toast.error('Failed to update item');
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      image: null, preview: null, category: '', gender: user?.gender || 'men',
      color: '', occasion: 'all', material: '', weatherSuitability: ['normal'], tags: ''
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    closeCamera();
  };

  const getImageSrc = (url) => {
    if (!url) return '';
    return url;
  };

  return (
    <div className="wardrobe-page animate-fadeIn">
      {/* Header */}
      <div className="page-top">
        <div>
          <h1>My Wardrobe</h1>
          <p>{items.length} item{items.length !== 1 ? 's' : ''} in your collection</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <Filter size={16} />
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`filter-tab ${filter === cat ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? 'All' : cat === 'laundry' ? 'Laundry Basket' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            {cat !== 'all' && (
              <span className={`filter-count ${cat === 'laundry' && items.filter(i => i.inLaundry).length > 0 ? 'filter-count--alert' : ''}`}>
                {cat === 'laundry'
                  ? items.filter(i => i.inLaundry).length
                  : items.filter(i => i.category === cat && !i.inLaundry).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filter === 'laundry' && items.filter(i => i.inLaundry).length > 0 && (
        <div className="laundry-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              if (window.confirm('Clear all items from laundry?')) {
                try {
                  await wardrobeAPI.clearAllLaundry();
                  toast.success('Laundry cleared');
                  loadItems();
                } catch (err) {
                  toast.error('Failed to clear laundry');
                }
              }
            }}
          >
            Wash All Laundry
          </button>
        </div>
      )}


      {/* Items Grid */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading wardrobe...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ImageIcon size={36} />
          </div>
          <h3>No items found</h3>
          <p>
            {filter === 'laundry'
              ? "Your laundry basket is empty. All your clothes are ready to wear!"
              : filter === 'all'
                ? "Your wardrobe is empty. Start by adding your clothing items."
                : `No ${filter} items found. Try a different filter or add new items.`}
          </p>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Plus size={18} />
            Add First Item
          </button>
        </div>
      ) : (
        <div className="wardrobe-grid">
          {items.filter(i => filter === 'all' ? !i.inLaundry : filter === 'laundry' ? i.inLaundry : i.category === filter && !i.inLaundry).map((item, idx) => (
            <div key={item._id} className="wardrobe-card" style={{ animationDelay: `${Math.min(idx * 0.04, 0.5)}s` }}>
              <div className="wardrobe-card-image">
                <img
                  src={getImageSrc(item.imageUrl)}
                  alt={item.category}
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add('img-error');
                  }}
                />
                {item.inLaundry && (
                  <div className="laundry-badge">In Laundry</div>
                )}
                <div className="card-overlay">
                  <button className="overlay-btn" onClick={() => setPreviewItem(item)} title="View">
                    <Eye size={16} />
                  </button>
                  {filter === 'laundry' ? (
                    <button className="overlay-btn" onClick={async () => {
                      try {
                        await wardrobeAPI.clearLaundryItem(item._id);
                        toast.success('Item washed');
                        loadItems();
                      } catch (err) {
                        toast.error('Failed to clear laundry item');
                      }
                    }} title="Wash">
                      <RefreshCw size={16} />
                    </button>
                  ) : (
                    <>
                      <button className="overlay-btn" onClick={() => setEditItem({ ...item })} title="Edit">
                        <Edit3 size={16} />
                      </button>
                      <button className="overlay-btn overlay-btn-danger" onClick={() => handleDelete(item._id)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="wardrobe-card-body">
                <div className="card-meta-row">
                  <span className="badge badge-teal">{item.category}</span>
                  <span className="badge badge-success">{item.gender}</span>
                </div>
                {item.color && (
                  <div className="card-color">
                    <div className="color-dot" style={{
                      background: item.color === 'white' ? '#f1f5f9'
                        : item.color === 'beige' ? '#f5f5dc'
                          : item.color === 'navy' ? '#001f3f'
                            : item.color === 'maroon' ? '#800000'
                              : item.color === 'purple' ? '#800080'
                                : item.color
                    }} />
                    <span>{item.color}</span>
                  </div>
                )}
                {item.occasion && item.occasion !== 'all' && (
                  <span className="card-occasion">{item.occasion}</span>
                )}
                {item.modelPrediction?.predictedCategory && (
                  <div className="card-ai-tag">
                    <Tag size={12} />
                    AI: {item.modelPrediction.predictedCategory}
                    ({Math.round((item.modelPrediction.confidence || 0) * 100)}%)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewItem && (
        <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewItem(null)}>
              <X size={24} />
            </button>
            <img src={getImageSrc(previewItem.imageUrl)} alt={previewItem.category} className="preview-img" />
            <div className="preview-info">
              <div className="card-meta-row" style={{ justifyContent: 'center' }}>
                <span className="badge badge-teal">{previewItem.category}</span>
                <span className="badge badge-success">{previewItem.gender}</span>
                {previewItem.color && <span className="badge badge-warning">{previewItem.color}</span>}
                {previewItem.occasion && previewItem.occasion !== 'all' && (
                  <span className="badge badge-teal">{previewItem.occasion}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => { setShowUpload(false); resetUploadForm(); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Clothing Item</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => { setShowUpload(false); resetUploadForm(); }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Image Upload Area */}
              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onPaste={handlePaste}
                tabIndex="0"
              >
                {uploadForm.preview ? (
                  <div className="upload-preview-container">
                    <img src={uploadForm.preview} alt="Preview" className="upload-preview" />
                    <button
                      className="btn btn-sm btn-secondary remove-preview"
                      onClick={(e) => { e.stopPropagation(); resetUploadForm(); }}
                    >
                      <X size={14} /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <Upload size={32} />
                    <span>Click to upload or drag image here</span>
                    <span className="upload-hint">JPG, PNG, WEBP (max 10MB)</span>
                  </div>
                )}
                {predicting && (
                  <div className="predict-overlay">
                    <div className="spinner-white" />
                    <span>AI Analysis in progress...</span>
                  </div>
                )}
              </div>

              <div className="upload-buttons">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileSelect}
                  hidden
                />
                <button className="btn btn-secondary btn-sm" onClick={() => { fileInputRef.current.value = ''; fileInputRef.current.click(); }}>
                  <Upload size={16} /> Upload File
                </button>

                <button className="btn btn-secondary btn-sm camera-btn" onClick={openCamera}>
                  <Camera size={16} /> Take Photo
                </button>
              </div>

              {/* Hidden canvas for camera capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="form-grid">
                <div className="input-group">
                  <label>Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className={uploadForm.category ? 'ai-highlight' : ''}
                  >
                    <option value="">Auto-detect (CNN)</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="dress">Dress (One-piece)</option>
                    <option value="shoes">Shoes</option>
                    <option value="bag">Bag</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Gender</label>
                  <select
                    value={uploadForm.gender}
                    onChange={e => setUploadForm({ ...uploadForm, gender: e.target.value })}
                    className={uploadForm.gender ? 'ai-highlight' : ''}
                  >
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Color</label>
                  <select
                    value={uploadForm.color}
                    onChange={e => setUploadForm({ ...uploadForm, color: e.target.value })}
                    className={uploadForm.color ? 'ai-highlight' : ''}
                  >
                    {COLORS.map(c => (
                      <option key={c} value={c}>
                        {c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Select color'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Occasion</label>
                  <select
                    value={uploadForm.occasion}
                    onChange={e => setUploadForm({ ...uploadForm, occasion: e.target.value })}
                    className={uploadForm.occasion !== 'all' ? 'ai-highlight' : ''}
                  >
                    {OCCASIONS.map(o => (
                      <option key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Material</label>
                  <select
                    value={uploadForm.material}
                    onChange={e => setUploadForm({ ...uploadForm, material: e.target.value })}
                    className={uploadForm.material ? 'ai-highlight' : ''}
                  >
                    <option value="">Select material</option>
                    {['cotton', 'denim', 'silk', 'wool', 'linen', 'leather', 'polyester', 'synthetic'].map(m => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Type (Sub-Category)</label>
                  <select
                    value={uploadForm.subCategory}
                    onChange={e => setUploadForm({ ...uploadForm, subCategory: e.target.value })}
                    className={uploadForm.subCategory ? 'ai-highlight' : ''}
                  >
                    <option value="">Select type</option>
                    {uploadForm.category === 'top' && (
                      <>
                        <option value="tshirt">T-Shirt</option>
                        <option value="shirt">Shirt</option>
                        <option value="blouse">Blouse</option>
                        <option value="kurta">Kurta</option>
                        <option value="sweater">Sweater</option>
                        <option value="jacket">Jacket</option>
                        <option value="blazer">Blazer</option>
                      </>
                    )}
                    {uploadForm.category === 'bottom' && (
                      <>
                        <option value="jeans">Jeans</option>
                        <option value="trousers">Trousers</option>
                        <option value="shorts">Shorts</option>
                        <option value="skirt">Skirt</option>
                        <option value="track-pants">Track Pants</option>
                      </>
                    )}
                    {uploadForm.category === 'dress' && (
                      <>
                        <option value="maxi">Maxi Dress</option>
                        <option value="midi">Midi Dress</option>
                        <option value="mini">Mini Dress</option>
                        <option value="gown">Gown</option>
                        <option value="sundress">Sundress</option>
                      </>
                    )}
                    {uploadForm.category === 'shoes' && (
                      <>
                        <option value="sneakers">Sneakers</option>
                        <option value="formal-shoes">Formal Shoes</option>
                        <option value="sandals">Sandals</option>
                        <option value="flats">Flats</option>
                        <option value="heels">Heels</option>
                        <option value="boots">Boots</option>
                      </>
                    )}
                    {uploadForm.category === 'bag' && (
                      <>
                        <option value="handbag">Handbag</option>
                        <option value="backpack">Backpack</option>
                        <option value="sling-bag">Sling Bag</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. summer, cotton, favorite"
                  value={uploadForm.tags}
                  onChange={e => setUploadForm({ ...uploadForm, tags: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowUpload(false); resetUploadForm(); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Uploading...</>
                ) : (
                  <><Upload size={18} /> Add Item</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal-overlay" onClick={closeCamera}>
          <div className="camera-modal" onClick={e => e.stopPropagation()}>
            <div className="camera-header">
              <h2><Camera size={20} /> Camera</h2>
              <button className="btn btn-icon btn-ghost" onClick={closeCamera}>
                <X size={20} />
              </button>
            </div>
            <div className="camera-body">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-preview"
              />
              {!cameraReady && (
                <div className="camera-loading">
                  <div className="spinner" />
                  <span>Starting camera...</span>
                </div>
              )}
            </div>
            <div className="camera-footer">
              <button className="btn btn-secondary" onClick={closeCamera}>Cancel</button>
              <button
                className="btn btn-primary camera-capture-btn"
                onClick={capturePhoto}
                disabled={!cameraReady}
              >
                <Camera size={18} /> Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Item</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setEditItem(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="edit-preview">
                <img src={getImageSrc(editItem.imageUrl)} alt="Item" />
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label>Category</label>
                  <select value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })}>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="shoes">Shoes</option>
                    <option value="bag">Bag</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Gender</label>
                  <select value={editItem.gender} onChange={e => setEditItem({ ...editItem, gender: e.target.value })}>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Color</label>
                  <select value={editItem.color} onChange={e => setEditItem({ ...editItem, color: e.target.value })}>
                    {COLORS.map(c => (
                      <option key={c} value={c}>{c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Select color'}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Occasion</label>
                  <select value={editItem.occasion} onChange={e => setEditItem({ ...editItem, occasion: e.target.value })}>
                    {OCCASIONS.map(o => (
                      <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
