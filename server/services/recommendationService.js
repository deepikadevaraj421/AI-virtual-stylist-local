/**
 * Smart Recommendation Service
 *
 * Implements: strict gender filter → occasion filter → weather filter
 * → material filter → color harmony scoring → combination generation
 * → XGBoost-style ranking → uniqueness enforcement
 */

// ════════════════════════════════════════════════════
// 1. COLOR SYSTEM
// ════════════════════════════════════════════════════
const NEUTRALS = new Set(['black', 'white', 'grey', 'beige', 'cream', 'navy', 'khaki', 'ivory', 'tan']);

const COLOR_FAMILIES = {
  neutral: ['black', 'white', 'grey', 'beige', 'cream', 'ivory', 'khaki', 'tan'],
  warm: ['red', 'orange', 'yellow', 'coral', 'peach', 'gold', 'rust'],
  cool: ['blue', 'green', 'teal', 'cyan', 'turquoise', 'mint', 'aqua'],
  earth: ['brown', 'olive', 'maroon', 'burgundy', 'mustard', 'camel', 'coffee', 'chocolate'],
  pastel: ['pink', 'lavender', 'lilac', 'baby-blue', 'peach', 'mint'],
  bright: ['red', 'magenta', 'fuchsia', 'electric-blue', 'neon', 'hot-pink'],
  dark: ['navy', 'black', 'charcoal', 'dark-green', 'dark-brown', 'maroon']
};

function getColorFamily(color) {
  if (!color) return 'neutral';
  const c = color.toLowerCase().trim();
  for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
    if (colors.includes(c)) return family;
  }
  return 'neutral';
}

function isNeutral(color) {
  if (!color) return true;
  return NEUTRALS.has(color.toLowerCase().trim());
}

/**
 * Score color harmony between items (0–1)
 */
function scoreColorHarmony(topColor, bottomColor, shoesColor) {
  const tN = isNeutral(topColor);
  const bN = isNeutral(bottomColor);
  const sN = isNeutral(shoesColor);

  const tF = getColorFamily(topColor);
  const bF = getColorFamily(bottomColor);
  const sF = getColorFamily(shoesColor);

  let score = 0.5;

  // Neutral + accent = great
  const neutralCount = [tN, bN, sN].filter(Boolean).length;
  if (neutralCount >= 2) score += 0.3;
  else if (neutralCount === 1) score += 0.15;

  // If exactly 1 accent against neutrals = excellent
  if (neutralCount === 2 && !tN) score += 0.1;
  if (neutralCount === 2 && !bN) score += 0.05;

  // Same color family (non-neutral) harmony
  if (!tN && !bN && tF === bF) score += 0.1;

  // Classic combos
  const tc = (topColor || '').toLowerCase();
  const bc = (bottomColor || '').toLowerCase();
  if ((tc === 'white' && bc === 'blue') || (tc === 'white' && bc === 'black') ||
    (tc === 'black' && bc === 'blue') || (tc === 'blue' && bc === 'beige') ||
    (tc === 'navy' && bc === 'grey') || (tc === 'white' && bc === 'navy')) {
    score += 0.15;
  }

  // Clash penalty: 3 bright non-neutrals from different families
  if (neutralCount === 0 && tF !== bF && bF !== sF && tF !== sF) {
    score -= 0.3;
  }

  return Math.max(0, Math.min(1, score));
}


// ════════════════════════════════════════════════════
// 2. MATERIAL COMPATIBILITY
// ════════════════════════════════════════════════════
const MATERIAL_COMPAT = {
  casual: ['cotton', 'denim', 'linen', 'knit', 'canvas', 'synthetic', 'polyester'],
  office: ['cotton', 'polyester', 'linen', 'silk', 'satin'],
  college: ['cotton', 'denim', 'linen', 'knit', 'canvas', 'synthetic', 'polyester'],
  party: ['silk', 'satin', 'velvet', 'chiffon', 'synthetic', 'polyester', 'linen'],
  ethnic: ['silk', 'cotton', 'chiffon', 'linen', 'satin'],
  sporty: ['synthetic', 'polyester', 'cotton', 'canvas', 'rubber']
};

const WEATHER_MATERIALS = {
  hot: { prefer: ['cotton', 'linen', 'chiffon'], avoid: ['wool', 'velvet', 'leather', 'knit'] },
  cold: { prefer: ['wool', 'knit', 'velvet', 'leather', 'denim'], avoid: ['chiffon', 'linen'] },
  rainy: { prefer: ['synthetic', 'polyester', 'rubber', 'canvas'], avoid: ['silk', 'satin', 'suede'] },
  normal: { prefer: [], avoid: [] }
};

function scoreMaterialCompat(item, occasion, weather) {
  const mat = (item.material || '').toLowerCase();
  if (!mat || mat === 'other' || mat === '') return 0.6; // no data = neutral

  let score = 0.5;
  const allowedMats = MATERIAL_COMPAT[occasion] || MATERIAL_COMPAT.casual;
  if (allowedMats.includes(mat)) score += 0.25;

  const wm = WEATHER_MATERIALS[weather] || WEATHER_MATERIALS.normal;
  if (wm.prefer.includes(mat)) score += 0.2;
  if (wm.avoid.includes(mat)) score -= 0.3;

  return Math.max(0, Math.min(1, score));
}


// ════════════════════════════════════════════════════
// 3. OCCASION RULES
// ════════════════════════════════════════════════════
const OCCASION_RULES = {
  office: {
    allowedTopSubs: ['shirt', 'blouse', 'blazer', 'tunic', 'top', 'kurta'],
    allowedBottomSubs: ['trousers', 'skirt', 'palazzos', 'jeans'],
    blockedBottomSubs: ['shorts', 'mini-skirt', 'track-pants'],
    allowedFootwear: ['formal-shoes', 'flats', 'loafers', 'heels'],
    blockedFootwear: ['slippers', 'sandals', 'sneakers'],
    preferColors: true
  },
  college: {
    allowedTopSubs:    ['kurta', 'shirt'],
    allowedBottomSubs: ['jeans', 'leggings', 'skirt', 'track-pants', 'trousers', 'joggers', 'palazzos'],
    blockedBottomSubs: ['shorts', 'mini-skirt'],
    allowedFootwear: ['sneakers', 'flats', 'sandals', 'loafers', 'boots'],
    blockedFootwear: ['heels'],
    preferColors: false
  },
  casual: {
    allowedTopSubs: ['tshirt', 'shirt', 'top', 'tunic', 'kurta', 'tank-top', 'crop-top', 'sweater', 'blouse'],
    allowedBottomSubs: ['jeans', 'leggings', 'shorts', 'skirt', 'track-pants', 'joggers', 'trousers', 'palazzos'],
    allowedFootwear: ['sneakers', 'flats', 'sandals', 'slippers', 'loafers', 'boots'],
    blockedFootwear: [],
    preferColors: false
  },
  party: {
    allowedTopSubs: ['top', 'blouse', 'crop-top', 'kurta', 'tunic', 'blazer', 'tank-top'],
    allowedBottomSubs: ['skirt', 'jeans', 'trousers', 'leggings', 'palazzos'],
    allowedFootwear: ['heels', 'flats', 'sandals', 'boots', 'loafers'],
    blockedFootwear: ['slippers', 'sneakers'],
    preferColors: false
  },
  ethnic: {
    allowedTopSubs: ['kurta', 'tunic', 'blouse', 'top'],
    allowedBottomSubs: ['leggings', 'palazzos', 'skirt', 'trousers'],
    allowedFootwear: ['flats', 'sandals', 'heels', 'loafers'],
    blockedFootwear: ['sneakers', 'slippers', 'boots'],
    preferColors: false
  },
  sporty: {
    allowedTopSubs: ['tshirt', 'tank-top', 'sweater'],
    allowedBottomSubs: ['track-pants', 'shorts', 'joggers', 'leggings'],
    allowedFootwear: ['sneakers', 'sandals'],
    blockedFootwear: ['heels', 'formal-shoes', 'loafers'],
    preferColors: false
  }
};

function getEffectiveFootwearType(item) {
  if (item.footwearType) return item.footwearType;
  if (item.subCategory) return item.subCategory;
  // Infer from tags
  const tags = (item.tags || []).map(t => t.toLowerCase());
  const ftTypes = ['sneakers', 'formal-shoes', 'flats', 'heels', 'sandals', 'slippers', 'boots', 'loafers'];
  for (const ft of ftTypes) {
    if (tags.includes(ft)) return ft;
  }
  return '';
}


// ════════════════════════════════════════════════════
// 4. WEATHER FOOTWEAR RULES
// ════════════════════════════════════════════════════
const WEATHER_FOOTWEAR = {
  hot: { prefer: ['sandals', 'flats', 'sneakers', 'slippers'], avoid: ['boots'] },
  cold: { prefer: ['boots', 'sneakers', 'formal-shoes', 'loafers'], avoid: ['sandals', 'slippers'] },
  rainy: { prefer: ['boots', 'sneakers', 'rubber'], avoid: ['heels', 'sandals', 'slippers', 'flats'] },
  normal: { prefer: [], avoid: [] }
};


// ════════════════════════════════════════════════════
// 5. FILTERING PIPELINE
// ════════════════════════════════════════════════════

/**
 * Step 1: Strict gender filter
 */
function filterByGender(items, userGender) {
  if (!userGender) return items; // no gender set = show all
  return items.filter(i => {
    const ig = (i.gender || '').toLowerCase();
    return ig === userGender || ig === 'unisex' || ig === '';
  });
}

/**
 * Step 2: Occasion filter (soft – fall back if empty)
 */
function filterByOccasion(items, occasion, category) {
  const rules = OCCASION_RULES[occasion] || OCCASION_RULES.casual;

  let filtered = items.filter(i => {
    // Item-level occasion check
    const itemOcc = (i.occasion || 'all').toLowerCase();
    if (itemOcc !== 'all' && itemOcc !== occasion) {
      // Allow college items for casual and vice versa
      if ((itemOcc === 'college' && occasion === 'casual') ||
        (itemOcc === 'casual' && occasion === 'college')) {
        // OK, close enough
      } else {
        // Instead of blocking, we'll let the scoring handle the penalty
        // for most items, but we'll still block very mismatched ones
        if ((itemOcc === 'office' && (occasion === 'casual' || occasion === 'college')) ||
          ((itemOcc === 'casual' || itemOcc === 'college') && occasion === 'office')) {
          // still block office/casual mix if it's explicitly tagged
        }
      }
    }

    // We no longer block footwear types here; we do it in scoring for variety
    return true;
  });

  return filtered;
}

/**
 * Step 3: Weather filter
 */
function filterByWeather(items, weather, category) {
  if (weather === 'normal') return items;

  let filtered = items.filter(i => {
    // 1. Strict check if weatherSuitability array is present
    if (i.weatherSuitability && i.weatherSuitability.length > 0) {
      if (i.weatherSuitability.includes(weather) || i.weatherSuitability.includes('normal')) {
        return true;
      }
    }

    // 2. Heuristic check based on subCategory and material
    const sub = (i.subCategory || '').toLowerCase();
    const mat = (i.material || '').toLowerCase();

    if (weather === 'hot') {
      const blockedSubs = ['jacket', 'sweater', 'boots', 'hoodie', 'blazer'];
      const blockedMats = ['wool', 'leather', 'velvet'];
      if (blockedSubs.includes(sub) || blockedMats.includes(mat)) return false;
    }

    if (weather === 'cold') {
      const preferredSubs = ['jacket', 'sweater', 'boots', 'hoodie', 'blazer', 'trousers', 'jeans'];
      const blockedSubs = ['shorts', 'sandals', 'tank-top', 'crop-top'];
      if (blockedSubs.includes(sub)) return false;
      // If it's cold, we strongly prefer long sleeves/legs, but won't strictly block unless it's obviously "summer only"
    }

    if (weather === 'rainy') {
      const blockedSubs = ['sandals', 'slippers', 'flats', 'heels'];
      if (blockedSubs.includes(sub)) return false;
    }

    // Footwear weather filter
    if (category === 'shoes') {
      const ft = getEffectiveFootwearType(i);
      const wf = WEATHER_FOOTWEAR[weather];
      if (ft && wf && wf.avoid.includes(ft)) return false;
    }

    return true;
  });

  // Soft fallback for weather
  return filtered.length > 0 ? filtered : items;
}

/**
 * Step 4: Laundry/availability filter
 */
function filterAvailable(items) {
  return items.filter(i => !i.inLaundry);
}


// ════════════════════════════════════════════════════
// 6. OUTFIT SCORING (XGBoost-style feature-based)
// ════════════════════════════════════════════════════

/**
 * Score a full outfit combination
 * Returns value 0–1
 */
function scoreOutfit(top, bottom, shoes, bag, occasion, weather, userGender) {
  const weights = {
    colorHarmony: 0.25,
    materialCompat: 0.15,
    occasionFit: 0.20,
    weatherFit: 0.15,
    footwearFit: 0.15,
    genderConsistency: 0.10
  };

  // 1. Color harmony
  const colorScore = scoreColorHarmony(top.color, bottom.color, shoes.color);

  // 2. Material compatibility (average across items)
  const matScores = [top, bottom, shoes].map(i => scoreMaterialCompat(i, occasion, weather));
  const materialScore = matScores.reduce((a, b) => a + b, 0) / matScores.length;

  // 3. Occasion fit
  let occasionScore = 0.5;
  const rules = OCCASION_RULES[occasion] || OCCASION_RULES.casual;

  // Top occasion fit
  const topOcc = (top.occasion || 'all').toLowerCase();
  if (topOcc === occasion || topOcc === 'all') occasionScore += 0.15;
  
  if (top.subCategory && rules.allowedTopSubs.includes(top.subCategory)) {
    occasionScore += 0.25; // Good match
  } else if (!top.subCategory) {
    occasionScore += 0.05; // neutral if no subcat
  } else if (occasion === 'college') {
    occasionScore -= 0.6; // Heavy penalty for non-kurta/shirt in college
  } else {
    occasionScore -= 0.1;
  }

  // Bottom occasion fit
  const botOcc = (bottom.occasion || 'all').toLowerCase();
  if (botOcc === occasion || botOcc === 'all') occasionScore += 0.1;
  if (bottom.subCategory && rules.allowedBottomSubs.includes(bottom.subCategory)) occasionScore += 0.05;
  if (bottom.subCategory && rules.blockedBottomSubs && rules.blockedBottomSubs.includes(bottom.subCategory)) occasionScore -= 0.4;

  // Shoes occasion fit
  const ft = getEffectiveFootwearType(shoes);
  if (ft && rules.allowedFootwear.includes(ft)) occasionScore += 0.1;
  if (ft && rules.blockedFootwear.includes(ft)) occasionScore -= 0.3;

  occasionScore = Math.max(0, Math.min(1, occasionScore));

  // 4. Weather fit
  let weatherScore = 0.7;
  if (weather !== 'normal') {
    const wm = WEATHER_MATERIALS[weather];
    [top, bottom, shoes].forEach(item => {
      const mat = (item.material || '').toLowerCase();
      if (mat && wm.prefer.includes(mat)) weatherScore += 0.1;
      if (mat && wm.avoid.includes(mat)) weatherScore -= 0.2;
    });
    if (ft) {
      const wf = WEATHER_FOOTWEAR[weather];
      if (wf.prefer.includes(ft)) weatherScore += 0.1;
      if (wf.avoid.includes(ft)) weatherScore -= 0.2;
    }
  }
  weatherScore = Math.max(0, Math.min(1, weatherScore));

  // 5. Footwear appropriateness
  let footwearScore = 0.6;
  if (ft) {
    // Office + formal shoes/flats = good
    if (occasion === 'office' && ['formal-shoes', 'flats', 'loafers', 'heels'].includes(ft)) footwearScore = 0.9;
    // Office + slippers = bad
    if (occasion === 'office' && ['slippers', 'sandals'].includes(ft)) footwearScore = 0.1;
    // Casual + sneakers/flats = good
    if (['casual', 'college'].includes(occasion) && ['sneakers', 'flats', 'sandals', 'loafers'].includes(ft)) footwearScore = 0.85;
    // Party + heels/flats = good
    if (occasion === 'party' && ['heels', 'flats', 'boots'].includes(ft)) footwearScore = 0.9;
    // Party + slippers = bad
    if (occasion === 'party' && ft === 'slippers') footwearScore = 0.1;
    // Ethnic + flats/sandals = good
    if (occasion === 'ethnic' && ['flats', 'sandals', 'heels'].includes(ft)) footwearScore = 0.9;
  }

  // 6. Gender consistency (all items must match or be unisex)
  let genderScore = 1.0;
  [top, bottom, shoes].forEach(item => {
    const ig = (item.gender || '').toLowerCase();
    if (ig !== userGender && ig !== 'unisex') {
      genderScore = 0.0; // Fatal: wrong gender
    }
  });

  // 7. Freshness penalty (recently worn items get lower score)
  let freshnessScore = 1.0;
  [top, bottom, shoes].forEach(item => {
    if (item.lastWorn) {
      const daysSinceWorn = (new Date() - new Date(item.lastWorn)) / (1000 * 60 * 60 * 24);
      if (daysSinceWorn < 3) freshnessScore -= (0.2 * (3 - daysSinceWorn) / 3);
    }
  });

  // Weighted final score
  let finalScore =
    colorScore * weights.colorHarmony +
    materialScore * weights.materialCompat +
    occasionScore * weights.occasionFit +
    weatherScore * weights.weatherFit +
    footwearScore * weights.footwearFit +
    genderScore * weights.genderConsistency;

  // Apply freshness and a tiny bit of randomness for variety
  finalScore = (finalScore * 0.9) + (freshnessScore * 0.1);
  finalScore += Math.random() * 0.05;

  return {
    total: Math.max(0, Math.min(1, finalScore)),
    breakdown: { colorScore, materialScore, occasionScore, weatherScore, footwearScore, genderScore, freshnessScore }
  };
}


// ════════════════════════════════════════════════════
// 7. COMBINATION GENERATION
// ════════════════════════════════════════════════════

/**
 * Generate top-N scored outfits from filtered pools.
 * Enforces uniqueness: no repeating same top/bottom/shoes.
 */
function generateScoredOutfits(tops, bottoms, shoes, bags, occasion, weather, userGender, maxOutfits = 5, favorites = new Set()) {
  const candidates = [];

  // Generate all valid combinations (capped to avoid explosion)
  const maxCombos = Math.min(tops.length * bottoms.length * shoes.length, 500);
  let count = 0;

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        if (count >= maxCombos) break;
        count++;

        const result = scoreOutfit(top, bottom, shoe, null, occasion, weather, userGender);

        // Skip if gender mismatch (score = 0)
        if (result.breakdown.genderScore === 0) continue;

        // FAVORITES BOOST: If this exact combo is favorited, give it a huge boost (+0.4)
        const comboKey = `${top._id}-${bottom._id}-${shoe._id}`;
        let finalScore = result.total;
        if (favorites.has(comboKey)) {
          finalScore = Math.min(1.0, finalScore + 0.4);
        }

        candidates.push({
          top, bottom, shoes: shoe,
          score: finalScore,
          breakdown: result.breakdown
        });
      }
      if (count >= maxCombos) break;
    }
    if (count >= maxCombos) break;
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Pick unique outfits: avoid repeating same top/bottom/shoes
  const selected = [];
  const usedTops = new Set();
  const usedBottoms = new Set();
  const usedShoes = new Set();

  for (const combo of candidates) {
    if (selected.length >= maxOutfits) break;

    const tid = combo.top._id.toString();
    const bid = combo.bottom._id.toString();
    const sid = combo.shoes._id.toString();

    // Relaxed uniqueness: avoid repeating same item unless we don't have enough variety
    if (usedTops.has(tid)) continue; // Always want unique tops if possible
    
    // Only block repeated shoes if we have more than 5 shoes available
    if (usedShoes.has(sid) && shoes.length > 5) continue; 
    
    // Only block repeated bottoms if we have more than 5 bottoms available
    if (usedBottoms.has(bid) && bottoms.length > 5) continue;

    selected.push(combo);
    usedTops.add(tid);
    usedBottoms.add(bid);
    usedShoes.add(sid);
  }

  // If we couldn't get enough, do a second pass with relaxed uniqueness
  if (selected.length < maxOutfits) {
    for (const combo of candidates) {
      if (selected.length >= maxOutfits) break;

      const tid = combo.top._id.toString();
      const bid = combo.bottom._id.toString();
      const sid = combo.shoes._id.toString();

      const alreadyIncluded = selected.some(s =>
        s.top._id.toString() === tid &&
        s.bottom._id.toString() === bid &&
        s.shoes._id.toString() === sid
      );
      if (alreadyIncluded) continue;

      selected.push(combo);
    }
  }

  // Assign bags
  return selected.map((combo, idx) => ({
    ...combo,
    bag: bags.length > 0 ? bags[idx % bags.length] : null,
    rank: idx + 1
  }));
}


// ════════════════════════════════════════════════════
// 8. REASON GENERATOR
// ════════════════════════════════════════════════════

function generateReason(score, occasion, weather, breakdown) {
  const reasons = [];

  if (score > 0.8) reasons.push('Excellent color and style harmony');
  else if (score > 0.65) reasons.push('Good style coordination');
  else if (score > 0.5) reasons.push('Decent combination');
  else reasons.push('Acceptable outfit');

  if (breakdown) {
    if (breakdown.colorScore > 0.75) reasons.push('Great color pairing');
    if (breakdown.footwearScore > 0.8) reasons.push('Perfect footwear choice');
    if (breakdown.materialScore > 0.7) reasons.push('Fabric harmony');
  }

  const occasionMap = {
    office: 'Professional look',
    college: 'Trendy campus look',
    casual: 'Relaxed everyday vibe',
    party: 'Eye-catching party style',
    ethnic: 'Beautiful ethnic ensemble',
    sporty: 'Active sporty look'
  };
  if (occasionMap[occasion]) reasons.push(occasionMap[occasion]);

  if (weather === 'hot') reasons.push('Breathable for warm weather');
  else if (weather === 'cold') reasons.push('Layered for cold weather');
  else if (weather === 'rainy') reasons.push('Practical for rain');

  return reasons.join(' • ');
}


// ════════════════════════════════════════════════════
// 9. MAIN API: getDailyRecommendations
// ════════════════════════════════════════════════════

/**
 * Full recommendation pipeline:
 *  1. Filter by gender
 *  2. Filter by occasion
 *  3. Filter by weather
 *  4. Filter availability (laundry)
 *  5. Generate scored combinations
 *  6. Return top N unique outfits
 */
function getDailyRecommendations(allItems, userGender, occasion, weather, maxOutfits = 5, favorites = new Set()) {
  // Split by category
  let tops = allItems.filter(i => i.category === 'top');
  let bottoms = allItems.filter(i => i.category === 'bottom');
  let shoes = allItems.filter(i => i.category === 'shoes');
  let bags = allItems.filter(i => i.category === 'bag');

  console.log(`[REC] Raw counts: ${tops.length} tops, ${bottoms.length} bottoms, ${shoes.length} shoes, ${bags.length} bags`);
  console.log(`[REC] User gender: "${userGender}", Occasion: "${occasion}", Weather: "${weather}"`);

  // PIPELINE: filter each pool
  // Step 1: Gender
  tops = filterByGender(tops, userGender);
  bottoms = filterByGender(bottoms, userGender);
  shoes = filterByGender(shoes, userGender);
  bags = filterByGender(bags, userGender);

  console.log(`[REC] After gender: ${tops.length} tops, ${bottoms.length} bottoms, ${shoes.length} shoes`);

  // Check minimum items after gender filter
  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    return {
      outfits: [],
      message: `No ${userGender} items found in your wardrobe. Please add more items or check your gender settings.`
    };
  }

  // Step 2: Occasion
  tops = filterByOccasion(tops, occasion, 'top');
  bottoms = filterByOccasion(bottoms, occasion, 'bottom');
  shoes = filterByOccasion(shoes, occasion, 'shoes');

  console.log(`[REC] After occasion: ${tops.length} tops, ${bottoms.length} bottoms, ${shoes.length} shoes`);

  // Step 3: Weather
  tops = filterByWeather(tops, weather, 'top');
  bottoms = filterByWeather(bottoms, weather, 'bottom');
  shoes = filterByWeather(shoes, weather, 'shoes');

  // Final check - if we filtered out everything, let's relax occasion/weather a bit
  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    console.log("[REC] No matches after strict filtering. Relaxing constraints...");
    // Try without sub-category restriction (just category + gender)
    tops = filterAvailable(filterByGender(allItems.filter(i => i.category === 'top'), userGender));
    bottoms = filterAvailable(filterByGender(allItems.filter(i => i.category === 'bottom'), userGender));
    shoes = filterAvailable(filterByGender(allItems.filter(i => i.category === 'shoes'), userGender));
    
    if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
      return {
        outfits: [],
        message: `Your wardrobe is too small for ${userGender} recommendations. Please add more items!`
      };
    }
  }

  // Step 4: Availability
  tops = filterAvailable(tops);
  bottoms = filterAvailable(bottoms);
  shoes = filterAvailable(shoes);

  console.log(`[REC] After availability: ${tops.length} tops, ${bottoms.length} bottoms, ${shoes.length} shoes`);

  // Step 5-6: Generate scored outfits
  const outfits = generateScoredOutfits(tops, bottoms, shoes, bags, occasion, weather, userGender, maxOutfits, favorites);

  return {
    outfits: outfits.map(o => ({
      rank: o.rank,
      score: parseFloat(o.score.toFixed(2)),
      reason: generateReason(o.score, occasion, weather, o.breakdown),
      top: o.top,
      bottom: o.bottom,
      shoes: o.shoes,
      bag: o.bag,
      occasion,
      weather
    }))
  };
}


// ════════════════════════════════════════════════════
// 10. WEEKLY PLAN GENERATION
// ════════════════════════════════════════════════════

/**
 * Generate one outfit per day with:
 * - Different occasion per day (from template)
 * - No repeating tops across the week
 * - Bottoms can be reused (jeans logic)
 * - Shoes can be reused moderately
 */
function getWeeklyRecommendations(allItems, userGender, template, weather = 'normal', favorites = new Set()) {
  const usedTopIds = new Set();
  const usedBottomCount = {};
  const results = [];

  for (const dayConfig of template) {
    const occasion = dayConfig.occasion || 'casual';
    const dayWeather = dayConfig.weather || weather;

    // Filter pools
    let topsPool = allItems.filter(i => i.category === 'top');
    let bottomsPool = allItems.filter(i => i.category === 'bottom');
    let shoesPool = allItems.filter(i => i.category === 'shoes');
    let bagsPool = allItems.filter(i => i.category === 'bag');

    // Apply strict filters
    let tops = filterAvailable(filterByWeather(filterByOccasion(filterByGender(topsPool, userGender), occasion, 'top'), dayWeather, 'top'));
    let bottoms = filterAvailable(filterByWeather(filterByOccasion(filterByGender(bottomsPool, userGender), occasion, 'bottom'), dayWeather, 'bottom'));
    let shoes = filterAvailable(filterByWeather(filterByOccasion(filterByGender(shoesPool, userGender), occasion, 'shoes'), dayWeather, 'shoes'));

    // FALLBACK: If strict filtering failed, relax occasion/weather (gender is never relaxed)
    if (tops.length === 0) tops = filterAvailable(filterByGender(topsPool, userGender));
    if (bottoms.length === 0) bottoms = filterAvailable(filterByGender(bottomsPool, userGender));
    if (shoes.length === 0) shoes = filterAvailable(filterByGender(shoesPool, userGender));

    // Exclude used tops (unique per day)
    let availableTops = tops.filter(t => !usedTopIds.has(t._id.toString()));
    if (availableTops.length === 0) availableTops = tops; // fallback: allow reuse

    // Prefer less-used bottoms
    bottoms.sort((a, b) => (usedBottomCount[a._id.toString()] || 0) - (usedBottomCount[b._id.toString()] || 0));

    if (availableTops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
      results.push({
        day: dayConfig.day,
        occasion,
        weather: dayWeather,
        top: null, bottom: null, shoes: null, bag: null,
        score: 0,
        reason: 'You need more items in your wardrobe to plan this day.',
        status: 'empty'
      });
      continue;
    }

    // Generate best outfit for this day
    const outfits = generateScoredOutfits(availableTops, bottoms, shoes, bagsPool, occasion, dayWeather, userGender, 1, favorites);

    if (outfits.length > 0) {
      const best = outfits[0];
      usedTopIds.add(best.top._id.toString());
      const bid = best.bottom._id.toString();
      usedBottomCount[bid] = (usedBottomCount[bid] || 0) + 1;

      results.push({
        day: dayConfig.day,
        occasion,
        weather: dayWeather,
        top: best.top, // full object
        bottom: best.bottom,
        shoes: best.shoes,
        bag: best.bag || null,
        score: parseFloat(best.score.toFixed(2)),
        reason: generateReason(best.score, occasion, dayWeather, best.breakdown),
        status: 'planned'
      });
    } else {
      results.push({
        day: dayConfig.day,
        occasion,
        weather: dayWeather,
        top: null, bottom: null, shoes: null, bag: null,
        score: 0,
        reason: 'Could not find a matching outfit',
        status: 'empty'
      });
    }
  }

  return results.filter(r => r.day); // Safety filter
}


// ════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════
module.exports = {
  getDailyRecommendations,
  getWeeklyRecommendations,
  scoreOutfit,
  generateReason,
  scoreColorHarmony,
  getColorFamily,
  filterByGender,
  filterByOccasion,
  filterByWeather,
  filterAvailable
};
