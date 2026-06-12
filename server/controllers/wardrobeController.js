const WardrobeItem = require('../models/WardrobeItem');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// @desc    Predict clothing attributes from image
// @route   POST /api/wardrobe/predict
exports.predictItem = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const imagePath = path.join(__dirname, '..', 'uploads', req.file.filename);
    
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/classify`, {
        image_path: imagePath
      }, { timeout: 30000 });

      // If this was just for prediction, we might want to delete the file after if we don't save it
      // But for now, we'll keep it as it might be used for the subsequent addItem call
      // Actually, let's return the filename so the frontend can use it

      res.json({
        category: response.data.predicted_category,
        subCategory: response.data.sub_category,
        gender: response.data.predicted_gender,
        material: response.data.predicted_material,
        occasion: response.data.predicted_occasion,
        weatherSuitability: response.data.weather_suitability,
        confidence: response.data.confidence,
        color: response.data.color,
        imageUrl: `/uploads/${req.file.filename}`,
        filename: req.file.filename
      });
    } catch (mlError) {
      console.error('ML service error during prediction:', mlError.message);
      res.status(500).json({ message: 'ML service unavailable' });
    }
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ message: 'Failed to predict item attributes' });
  }
};

// @desc    Upload wardrobe item
// @route   POST /api/wardrobe
exports.addItem = async (req, res) => {
  try {
    const { 
      category, gender, color, occasion, tags, imageUrl, filename,
      subCategory, material, styleType, weatherSuitability
    } = req.body;
    
    let finalImageUrl = imageUrl;
    let finalCategory = category;
    let finalColor = color;
    let finalWeather = weatherSuitability;
    
    // Parse JSON strings from FormData if necessary
    if (typeof finalWeather === 'string') {
      try { finalWeather = JSON.parse(finalWeather); } catch (e) { finalWeather = ['normal']; }
    }
    
    let modelPrediction = {};

    // If an image is uploaded in this request
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
      const imagePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      
      try {
        const response = await axios.post(`${ML_SERVICE_URL}/classify`, {
          image_path: imagePath
        }, { timeout: 30000 });

        if (response.data) {
          modelPrediction = {
            predictedCategory: response.data.predicted_category,
            confidence: response.data.confidence,
            embedding: response.data.embedding || []
          };
          if (!finalCategory) finalCategory = response.data.predicted_category;
          if (!finalColor) finalColor = response.data.color;
          // If weather is just the default, use the AI detected one
          if (!finalWeather || (Array.isArray(finalWeather) && finalWeather.length === 1 && finalWeather[0] === 'normal')) {
            finalWeather = response.data.weather_suitability;
          }
        }
      } catch (mlError) {
        console.log('ML service not available during add:', mlError.message);
      }
    }

    const item = await WardrobeItem.create({
      userId: req.user._id,
      imageUrl: finalImageUrl,
      category: finalCategory || 'top',
      subCategory: subCategory || '',
      gender: gender || req.user.gender || 'unisex',
      color: finalColor || '',
      material: material || '',
      styleType: styleType || '',
      occasion: occasion || 'all',
      weatherSuitability: Array.isArray(finalWeather) ? finalWeather : ['normal'],
      tags: tags ? (typeof tags === 'string' ? (tags.startsWith('[') ? JSON.parse(tags) : tags.split(',').map(t => t.trim())) : tags) : [],
      modelPrediction
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('ADD ITEM ERROR DETAILS:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      file: req.file ? req.file.filename : 'none'
    });
    res.status(500).json({ message: 'Failed to add wardrobe item: ' + error.message });
  }
};

// @desc    Get all wardrobe items for user
// @route   GET /api/wardrobe
exports.getItems = async (req, res) => {
  try {
    const { category, gender, occasion } = req.query;
    const filter = { userId: req.user._id };

    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (occasion && occasion !== 'all') filter.occasion = { $in: [occasion, 'all'] };

    const items = await WardrobeItem.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wardrobe items' });
  }
};

// @desc    Get single wardrobe item
// @route   GET /api/wardrobe/:id
exports.getItem = async (req, res) => {
  try {
    const item = await WardrobeItem.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch item' });
  }
};

// @desc    Update wardrobe item
// @route   PUT /api/wardrobe/:id
exports.updateItem = async (req, res) => {
  try {
    const { category, gender, color, occasion, tags } = req.body;

    const item = await WardrobeItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { category, gender, color, occasion, tags: tags || [] },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item' });
  }
};

// @desc    Delete wardrobe item
// @route   DELETE /api/wardrobe/:id
exports.deleteItem = async (req, res) => {
  try {
    const item = await WardrobeItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Delete image file - handle leading slash for cross-platform path.join
    const relativeImageUrl = item.imageUrl.startsWith('/') ? item.imageUrl.slice(1) : item.imageUrl;
    const imagePath = path.join(__dirname, '..', relativeImageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('DELETE ITEM ERROR DETAILS:', {
      message: error.message,
      id: req.params.id,
      user: req.user._id
    });
    res.status(500).json({ message: 'Failed to delete item: ' + error.message });
  }
};

// @desc    Get wardrobe stats
// @route   GET /api/wardrobe/stats
exports.getStats = async (req, res) => {
  try {
    const stats = await WardrobeItem.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await WardrobeItem.countDocuments({ userId: req.user._id });

    res.json({ total, byCategory: stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// @desc    Get laundry items
// @route   GET /api/wardrobe/laundry
exports.getLaundry = async (req, res) => {
  try {
    const items = await WardrobeItem.find({ userId: req.user._id, inLaundry: true })
      .sort({ lastWorn: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch laundry items' });
  }
};

// @desc    Clear single item from laundry
// @route   PUT /api/wardrobe/laundry/:id/clear
exports.clearLaundryItem = async (req, res) => {
  try {
    const item = await WardrobeItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { inLaundry: false },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item cleared from laundry', item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear laundry item' });
  }
};

// @desc    Clear all laundry
// @route   PUT /api/wardrobe/laundry/clear-all
exports.clearAllLaundry = async (req, res) => {
  try {
    const result = await WardrobeItem.updateMany(
      { userId: req.user._id, inLaundry: true },
      { inLaundry: false }
    );
    res.json({ message: `${result.modifiedCount} items cleared from laundry` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear laundry' });
  }
};

// @desc    Schedule laundry return
// @route   PUT /api/wardrobe/laundry/:id/schedule
exports.scheduleLaundry = async (req, res) => {
  try {
    const { readyAt } = req.body;
    const item = await WardrobeItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { laundryReadyAt: new Date(readyAt) },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Laundry return scheduled', item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to schedule laundry' });
  }
};
