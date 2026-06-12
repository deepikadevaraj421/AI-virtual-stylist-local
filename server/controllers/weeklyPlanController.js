const WeeklyPlan = require('../models/WeeklyPlan');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');
const OutfitHistory = require('../models/OutfitHistory');
const { getWeeklyRecommendations, getDailyRecommendations, generateReason } = require('../services/recommendationService');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper: Get Monday of current week
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// @desc    Get or generate weekly plan
// @route   GET /api/weekly-plan
exports.getWeeklyPlan = async (req, res) => {
  try {
    const weekStart = getWeekStart();
    let plan = await WeeklyPlan.findOne({
      userId: req.user._id,
      weekStart
    }).populate('days.top days.bottom days.shoes days.bag');

    if (!plan) {
      plan = await generateWeeklyPlan(req.user);
      plan = await WeeklyPlan.findById(plan._id)
        .populate('days.top days.bottom days.shoes days.bag');
    }

    res.json(plan);
  } catch (error) {
    console.error('Get weekly plan error:', error);
    // If it's a validation error or corrupted data, try forcing a fresh one
    try {
      console.log('Attempting emergency regeneration...');
      const freshPlan = await generateWeeklyPlan(req.user, true);
      const populated = await WeeklyPlan.findById(freshPlan._id)
        .populate('days.top days.bottom days.shoes days.bag');
      return res.json(populated);
    } catch (regenError) {
      res.status(500).json({ message: 'Failed to fetch weekly plan. Please try again later.' });
    }
  }
};

// @desc    Generate weekly plan
// @route   POST /api/weekly-plan/generate
exports.generatePlan = async (req, res) => {
  try {
    const plan = await generateWeeklyPlan(req.user, true);
    const populated = await WeeklyPlan.findById(plan._id)
      .populate('days.top days.bottom days.shoes days.bag');
    res.json(populated);
  } catch (error) {
    console.error('Generate plan error:', error);
    res.status(500).json({ message: 'Failed to generate weekly plan' });
  }
};

// @desc    Update a single day in weekly plan
// @route   PUT /api/weekly-plan/day
exports.updateDay = async (req, res) => {
  try {
    const { day, occasion, weather } = req.body;
    const weekStart = getWeekStart();

    let plan = await WeeklyPlan.findOne({ userId: req.user._id, weekStart });
    if (!plan) {
      plan = await generateWeeklyPlan(req.user);
    }

    const dayIndex = plan.days.findIndex(d => d.day === day);
    if (dayIndex === -1) {
      return res.status(404).json({ message: 'Day not found in plan' });
    }

    // Get all user items and regenerate this day's outfit using the smart service
    const allItems = await WardrobeItem.find({ userId: req.user._id });
    const userGender = req.user.gender;
    const occ = occasion || plan.days[dayIndex].occasion;
    const wth = weather || plan.days[dayIndex].weather || 'normal';

    const result = getDailyRecommendations(allItems, userGender, occ, wth, 1);

    if (result.outfits.length > 0) {
      const best = result.outfits[0];
      plan.days[dayIndex] = {
        day,
        occasion: occ,
        weather: wth,
        top: best.top._id,
        bottom: best.bottom._id,
        shoes: best.shoes._id,
        bag: best.bag ? best.bag._id : null,
        score: best.score,
        reason: best.reason,
        status: 'planned'
      };
    } else {
      plan.days[dayIndex].occasion = occ;
      plan.days[dayIndex].weather = wth;
      plan.days[dayIndex].status = 'empty';
      plan.days[dayIndex].reason = 'Not enough items for this occasion/weather';
    }

    await plan.save();

    const populated = await WeeklyPlan.findById(plan._id)
      .populate('days.top days.bottom days.shoes days.bag');
    res.json(populated);
  } catch (error) {
    console.error('Update day error:', error);
    res.status(500).json({ message: 'Failed to update day' });
  }
};

// @desc    Mark laundry as completed
// @route   POST /api/weekly-plan/laundry
exports.completeLaundry = async (req, res) => {
  try {
    await WardrobeItem.updateMany(
      { userId: req.user._id, inLaundry: true },
      { inLaundry: false }
    );

    const weekStart = getWeekStart();
    const plan = await WeeklyPlan.findOneAndUpdate(
      { userId: req.user._id, weekStart },
      { laundryStatus: 'completed', laundryCompletedAt: new Date() },
      { new: true }
    ).populate('days.top days.bottom days.shoes days.bag');

    res.json({ message: 'Laundry completed! All items available again.', plan });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete laundry' });
  }
};

// @desc    Mark day as worn
// @route   POST /api/weekly-plan/worn
exports.markDayWorn = async (req, res) => {
  try {
    const { day } = req.body;
    const weekStart = getWeekStart();

    const plan = await WeeklyPlan.findOne({ userId: req.user._id, weekStart });
    if (!plan) return res.status(404).json({ message: 'No plan found' });

    const dayData = plan.days.find(d => d.day === day);
    if (!dayData) return res.status(404).json({ message: 'Day not found' });

    dayData.status = 'worn';
    await plan.save();

    // Mark clothes (top/bottom) as in laundry
    const clothesToMark = [dayData.top, dayData.bottom].filter(Boolean);
    if (clothesToMark.length > 0) {
      await WardrobeItem.updateMany(
        { _id: { $in: clothesToMark } },
        {
          inLaundry: true,
          $inc: { wornCount: 1 },
          lastWorn: new Date()
        }
      );
    }

    // Update shoes (worn count only, shoes don't go to laundry every time)
    if (dayData.shoes) {
      await WardrobeItem.findByIdAndUpdate(dayData.shoes, {
        $inc: { wornCount: 1 },
        lastWorn: new Date()
      });
    }

    const populated = await WeeklyPlan.findById(plan._id)
      .populate('days.top days.bottom days.shoes days.bag');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark day as worn' });
  }
};

// ═══════════════════════════════════════════════════
// Internal: Generate weekly plan using smart service
// ═══════════════════════════════════════════════════
async function generateWeeklyPlan(user, forceRegenerate = false) {
  const weekStart = getWeekStart();

  if (forceRegenerate) {
    await WeeklyPlan.findOneAndDelete({ userId: user._id, weekStart });
  }

  const existing = await WeeklyPlan.findOne({ userId: user._id, weekStart });
  if (existing) return existing;

  const userGender = user.gender;
  const allItems = await WardrobeItem.find({ userId: user._id });

  // Try to get real weather forecast for the week
  let weatherForecast = [];
  try {
    const { getWeeklyWeather } = require('../services/weatherService');
    weatherForecast = await getWeeklyWeather();
  } catch (e) {
    console.log('Failed to fetch weather for weekly plan:', e.message);
  }

  const template = user.weeklyTemplate || [
    { day: 'Monday', occasion: 'college' },
    { day: 'Tuesday', occasion: 'college' },
    { day: 'Wednesday', occasion: 'college' },
    { day: 'Thursday', occasion: 'college' },
    { day: 'Friday', occasion: 'office' },
    { day: 'Saturday', occasion: 'casual' },
    { day: 'Sunday', occasion: 'party' }
  ];

  // Map forecast to template days
  const updatedTemplate = template.map(t => {
    const dayName = t.day || '';
    const forecast = weatherForecast.find(f => f.day === dayName);
    return {
      day: dayName,
      occasion: t.occasion || 'casual',
      weather: forecast ? forecast.weather : 'normal'
    };
  });

  // Fetch favorites
  const favDocs = await OutfitHistory.find({ userId: user._id, isFavorite: true });
  const favoritesSet = new Set(favDocs.map(f => `${f.top}-${f.bottom}-${f.shoes}`));

  // Use the smart recommendation service
  const days = getWeeklyRecommendations(allItems, userGender, updatedTemplate, 'normal', favoritesSet);

  const plan = await WeeklyPlan.create({
    userId: user._id,
    weekStart,
    days,
    laundryStatus: 'pending'
  });

  return plan;
}
