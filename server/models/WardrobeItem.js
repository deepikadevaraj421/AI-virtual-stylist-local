const mongoose = require('mongoose');

const wardrobeItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image is required']
  },
  // ── Core classification ──────────────────────────
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['top', 'bottom', 'shoes', 'bag', 'dress']
  },
  subCategory: {
    type: String,
    default: ''
    // top: tshirt, shirt, blouse, kurta, tunic, sweater, jacket, blazer, tank-top, crop-top
    // bottom: jeans, trousers, leggings, skirt, shorts, track-pants, palazzos, joggers
    // shoes: sneakers, formal-shoes, flats, heels, sandals, slippers, boots, loafers
    // bag: handbag, backpack, tote, clutch, sling-bag, laptop-bag
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['men', 'women', 'unisex']
  },

  // ── Color metadata ───────────────────────────────
  color: {
    type: String,
    default: ''
  },
  colorFamily: {
    type: String,
    enum: ['neutral', 'warm', 'cool', 'earth', 'pastel', 'bright', 'dark', ''],
    default: ''
  },

  // ── Material & Style ─────────────────────────────
  material: {
    type: String,
    enum: ['cotton', 'denim', 'silk', 'wool', 'chiffon', 'synthetic', 'linen', 'leather', 'polyester', 'knit', 'velvet', 'satin', 'canvas', 'rubber', 'other', ''],
    default: ''
  },
  styleType: {
    type: String,
    enum: ['casual', 'formal', 'ethnic', 'sporty', 'party', 'streetwear', 'classic', ''],
    default: ''
  },

  // ── Suitability ──────────────────────────────────
  occasion: {
    type: String,
    enum: ['casual', 'office', 'college', 'party', 'ethnic', 'sporty', 'all'],
    default: 'all'
  },
  weatherSuitability: {
    type: [String],
    enum: ['hot', 'cold', 'rainy', 'normal'],
    default: ['normal']
  },

  // ── Footwear specific ────────────────────────────
  footwearType: {
    type: String,
    enum: ['sneakers', 'formal-shoes', 'flats', 'heels', 'sandals', 'slippers', 'boots', 'loafers', ''],
    default: ''
  },

  tags: {
    type: [String],
    default: []
  },
  modelPrediction: {
    predictedCategory: String,
    confidence: Number,
    embedding: [Number]
  },

  // ── Wear tracking ────────────────────────────────
  wornCount: {
    type: Number,
    default: 0
  },
  lastWorn: {
    type: Date,
    default: null
  },
  inLaundry: {
    type: Boolean,
    default: false
  },
  laundryReadyAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

wardrobeItemSchema.index({ userId: 1, category: 1 });
wardrobeItemSchema.index({ userId: 1, gender: 1 });
wardrobeItemSchema.index({ userId: 1, occasion: 1 });

module.exports = mongoose.model('WardrobeItem', wardrobeItemSchema);
