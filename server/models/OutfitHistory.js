const mongoose = require('mongoose');

const outfitHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  top: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WardrobeItem'
  },
  bottom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WardrobeItem'
  },
  shoes: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WardrobeItem'
  },
  bag: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WardrobeItem',
    default: null
  },
  occasion: {
    type: String,
    default: 'casual'
  },
  weather: {
    type: String,
    default: 'normal'
  },
  score: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    default: ''
  },
  wornStatus: {
    type: String,
    enum: ['suggested', 'worn', 'skipped'],
    default: 'suggested'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  day: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OutfitHistory', outfitHistorySchema);
