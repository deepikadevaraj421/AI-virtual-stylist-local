const WardrobeItem = require('../models/WardrobeItem');
const OutfitHistory = require('../models/OutfitHistory');
const axios = require('axios');
const { getDailyRecommendations, generateReason, filterByGender, filterByOccasion, filterByWeather, filterAvailable } = require('../services/recommendationService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Try ML-powered recommendations first (KNN + XGBoost).
 * Falls back to rule-based if ML service is unavailable.
 */
async function getMLRecommendations(tops, bottoms, shoes, bags, userGender, occasion, weather, topK, favoritesSet = new Set()) {
  try {
    // Prepare items with embeddings for the ML service
    const topsData = tops.map(t => ({
      id: t._id.toString(),
      embedding: t.modelPrediction?.embedding || [],
      color: t.color || '',
      subCategory: t.subCategory || '',
      occasion: t.occasion || 'all',
      material: t.material || ''
    }));

    const bottomsData = bottoms.map(b => ({
      id: b._id.toString(),
      embedding: b.modelPrediction?.embedding || [],
      color: b.color || '',
      subCategory: b.subCategory || '',
      occasion: b.occasion || 'all',
      material: b.material || ''
    }));

    const shoesData = shoes.map(s => ({
      id: s._id.toString(),
      embedding: s.modelPrediction?.embedding || [],
      color: s.color || '',
      subCategory: s.subCategory || s.footwearType || '',
      occasion: s.occasion || 'all',
      material: s.material || ''
    }));

    const bagsData = bags.map(bg => ({
      id: bg._id.toString(),
      embedding: bg.modelPrediction?.embedding || [],
      color: bg.color || ''
    }));

    // Call ML service /recommend endpoint (KNN + XGBoost pipeline)
    const response = await axios.post(`${ML_SERVICE_URL}/recommend`, {
      tops: topsData,
      bottoms: bottomsData,
      shoes: shoesData,
      bags: bagsData,
      gender: userGender,
      occasion,
      weather,
      topK
    }, { timeout: 30000 });

    if (response.data && response.data.outfits && response.data.outfits.length > 0) {
      // Apply favorites boost manually to ML outputs
      const boostedOutfits = response.data.outfits.map(o => {
        const comboKey = `${o.top_id}-${o.bottom_id}-${o.shoes_id}`;
        if (favoritesSet.has(comboKey)) {
          o.score = Math.min(1.0, o.score + 0.4);
        }
        return o;
      });
      // Re-sort after boost
      boostedOutfits.sort((a, b) => b.score - a.score);
      return boostedOutfits;
    }
    return null;
  } catch (err) {
    console.log('ML recommendation service unavailable, falling back to rule-based:', err.message);
    return null;
  }
}

// @desc    Get Top 5 Daily Outfits (Screen A)
// @route   POST /api/recommendations/daily
exports.getDailyTop5 = async (req, res) => {
  try {
    const { occasion = 'casual', weather = 'normal' } = req.body;
    const userGender = req.user.gender || 'women'; // default if not set

    // Fetch ALL user wardrobe items
    const allItems = await WardrobeItem.find({ userId: req.user._id });

    if (allItems.length === 0) {
      return res.json({
        outfits: [],
        message: 'Your wardrobe is empty. Add items to get recommendations.'
      });
    }

    // Split by category
    const allTops = allItems.filter(i => i.category === 'top');
    const allBottoms = allItems.filter(i => i.category === 'bottom');
    const allShoes = allItems.filter(i => i.category === 'shoes');
    const allBags = allItems.filter(i => i.category === 'bag');

    if (allTops.length === 0 || allBottoms.length === 0 || allShoes.length === 0) {
      return res.json({
        outfits: [],
        message: 'Add at least 1 top, 1 bottom, and 1 pair of shoes to get recommendations.'
      });
    }

    // Step 1: Try ML pipeline (KNN + XGBoost) if items have embeddings
    const topsWithEmb = allTops.filter(t => t.modelPrediction?.embedding?.length > 0);
    const bottomsWithEmb = allBottoms.filter(b => b.modelPrediction?.embedding?.length > 0);
    const shoesWithEmb = allShoes.filter(s => s.modelPrediction?.embedding?.length > 0);

    // Fetch favorites
    const favDocs = await OutfitHistory.find({ userId: req.user._id, isFavorite: true });
    const favoritesSet = new Set(favDocs.map(f => `${f.top}-${f.bottom}-${f.shoes}`));

    if (topsWithEmb.length > 0 && bottomsWithEmb.length > 0 && shoesWithEmb.length > 0) {
      console.log(`ML Pipeline: ${topsWithEmb.length} tops, ${bottomsWithEmb.length} bottoms, ${shoesWithEmb.length} shoes with embeddings`);
      
      const mlOutfits = await getMLRecommendations(
        topsWithEmb, bottomsWithEmb, shoesWithEmb, allBags,
        userGender, occasion, weather, 5, favoritesSet
      );

      if (mlOutfits && mlOutfits.length > 0) {
        const itemMap = {};
        allItems.forEach(item => { itemMap[item._id.toString()] = item; });

        const outfits = mlOutfits.map((outfit, idx) => {
          const top = itemMap[outfit.top_id];
          const bottom = itemMap[outfit.bottom_id];
          const shoe = itemMap[outfit.shoes_id];
          const bag = allBags.length > 0 ? allBags[idx % allBags.length] : null;

          if (!top || !bottom || !shoe) return null;

          const score = Math.max(0, Math.min(1, outfit.score));
          return {
            rank: idx + 1,
            score: parseFloat(score.toFixed(2)),
            reason: generateReason(score, occasion, weather, null),
            top, bottom, shoes: shoe, bag,
            occasion, weather, source: 'ml'
          };
        }).filter(Boolean);

        if (outfits.length > 0) {
          console.log(`ML pipeline SUCCESS: ${outfits.length} outfits`);
          return res.json({ outfits });
        }
      }
    }

    // Step 2: Rule-based fallback (has its own gender/occasion/weather filtering with soft fallbacks)
    console.log('Using rule-based recommendation engine');
    const result = getDailyRecommendations(allItems, userGender, occasion, weather, 5, favoritesSet);

    if (result.outfits.length === 0) {
      return res.json({
        outfits: [],
        message: result.message || 'Not enough items to generate outfits.'
      });
    }

    res.json({ outfits: result.outfits });
  } catch (error) {
    console.error('Daily recommendation error:', error);
    res.status(500).json({ message: 'Failed to generate recommendations' });
  }
};

// @desc    Mark outfit as worn
// @route   POST /api/recommendations/worn
exports.markAsWorn = async (req, res) => {
  try {
    const { topId, bottomId, shoesId, bagId, occasion, weather, score, day } = req.body;

    // Create history record
    const history = await OutfitHistory.create({
      userId: req.user._id,
      top: topId,
      bottom: bottomId,
      shoes: shoesId,
      bag: bagId || null,
      occasion,
      weather,
      score,
      day: day || new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      wornStatus: 'worn'
    });

    // Update worn count and last worn date
    await WardrobeItem.updateMany(
      { _id: { $in: [topId, bottomId, shoesId].filter(Boolean) } },
      { $inc: { wornCount: 1 }, $set: { lastWorn: new Date() } }
    );

    // --- Intelligent Laundry Logic ---
    const laundryIds = [];

    // 1. Tops: Always go to laundry after 1 wear
    laundryIds.push(topId);

    // 2. Bottoms: Selective laundry
    const bottom = await WardrobeItem.findById(bottomId);
    if (bottom) {
      const isJeans = (bottom.subCategory || '').toLowerCase() === 'jeans' || 
                      (bottom.tags || []).some(t => t.toLowerCase().includes('jeans'));
      
      if (isJeans) {
        // Jeans go to laundry every 5 wears
        if (bottom.wornCount % 5 === 0 && bottom.wornCount > 0) {
          laundryIds.push(bottomId);
        }
      }
      // Non-jeans bottoms are excluded from automatic laundry as per user request
    }

    // 3. Shoes: Go to laundry after every 3 wears
    const shoe = await WardrobeItem.findById(shoesId);
    if (shoe && shoe.wornCount % 3 === 0 && shoe.wornCount > 0) {
      laundryIds.push(shoesId);
    }

    if (laundryIds.length > 0) {
      await WardrobeItem.updateMany(
        { _id: { $in: laundryIds.filter(Boolean) } },
        { $set: { inLaundry: true } }
      );
    }

    res.json({ message: 'Outfit marked as worn', history });
  } catch (error) {
    console.error('Mark worn error:', error);
    res.status(500).json({ message: 'Failed to mark outfit as worn' });
  }
};

// @desc    Save outfit as favorite
// @route   POST /api/recommendations/favorite
exports.saveFavorite = async (req, res) => {
  try {
    const { topId, bottomId, shoesId, bagId, occasion, weather, score } = req.body;

    const favorite = await OutfitHistory.create({
      userId: req.user._id,
      top: topId,
      bottom: bottomId,
      shoes: shoesId,
      bag: bagId || null,
      occasion,
      weather,
      score,
      wornStatus: 'suggested',
      isFavorite: true
    });

    res.json({ message: 'Outfit saved as favorite', favorite });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save favorite' });
  }
};

// @desc    Get favorites
// @route   GET /api/recommendations/favorites
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await OutfitHistory.find({
      userId: req.user._id,
      isFavorite: true
    })
    .populate('top bottom shoes bag')
    .sort({ createdAt: -1 });

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
};

// @desc    Get outfit history
// @route   GET /api/recommendations/history
exports.getHistory = async (req, res) => {
  try {
    const history = await OutfitHistory.find({
      userId: req.user._id,
      wornStatus: 'worn'
    })
    .populate('top bottom shoes bag')
    .sort({ createdAt: -1 })
    .limit(30);

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};
