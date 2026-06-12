const mongoose = require('mongoose');

const dayPlanSchema = new mongoose.Schema({
  day: { type: String, required: true },
  occasion: { type: String, default: 'casual' },
  weather: { type: String, default: 'normal' },
  top: { type: mongoose.Schema.Types.ObjectId, ref: 'WardrobeItem', default: null },
  bottom: { type: mongoose.Schema.Types.ObjectId, ref: 'WardrobeItem', default: null },
  shoes: { type: mongoose.Schema.Types.ObjectId, ref: 'WardrobeItem', default: null },
  bag: { type: mongoose.Schema.Types.ObjectId, ref: 'WardrobeItem', default: null },
  score: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['planned', 'worn', 'skipped', 'empty'],
    default: 'planned'
  }
}, { _id: false });

const weeklyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  weekStart: {
    type: Date,
    required: true
  },
  days: {
    type: [dayPlanSchema],
    default: []
  },
  laundryStatus: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  laundryCompletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

weeklyPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyPlan', weeklyPlanSchema);
