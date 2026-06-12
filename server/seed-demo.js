/**
 * Seed script to create a demo admin account with pre-loaded wardrobe items
 * with DETAILED metadata: subCategory, material, styleType, colorFamily,
 * weatherSuitability, footwearType for proper outfit matching.
 *
 * Run: node seed-demo.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const WardrobeItem = require('./models/WardrobeItem');

const DATASET_DIR = path.join(__dirname, '..', 'dataset_balanced');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ITEMS_PER_CATEGORY = 8;

// ═══════════════════════════════════════════════════
// Detailed metadata for women's wardrobe items
// Each item gets realistic, fashion-accurate attributes
// ═══════════════════════════════════════════════════

const TOP_ITEMS = [
  { subCategory: 'tshirt',  color: 'white',  colorFamily: 'neutral', material: 'cotton',    styleType: 'casual',  occasion: 'casual',  weatherSuitability: ['hot', 'normal'] },
  { subCategory: 'shirt',   color: 'blue',   colorFamily: 'cool',    material: 'cotton',    styleType: 'formal',  occasion: 'office',  weatherSuitability: ['normal'] },
  { subCategory: 'top',     color: 'red',    colorFamily: 'warm',    material: 'polyester', styleType: 'party',   occasion: 'party',   weatherSuitability: ['normal'] },
  { subCategory: 'kurta',   color: 'green',  colorFamily: 'cool',    material: 'cotton',    styleType: 'ethnic',  occasion: 'college', weatherSuitability: ['hot', 'normal'] },
  { subCategory: 'blouse',  color: 'pink',   colorFamily: 'pastel',  material: 'silk',      styleType: 'party',   occasion: 'party',   weatherSuitability: ['normal'] },
  { subCategory: 'tshirt',  color: 'black',  colorFamily: 'neutral', material: 'cotton',    styleType: 'casual',  occasion: 'college', weatherSuitability: ['normal'] },
  { subCategory: 'top',     color: 'navy',   colorFamily: 'dark',    material: 'polyester', styleType: 'formal',  occasion: 'office',  weatherSuitability: ['normal', 'cold'] },
  { subCategory: 'tunic',   color: 'beige',  colorFamily: 'neutral', material: 'linen',     styleType: 'casual',  occasion: 'casual',  weatherSuitability: ['hot', 'normal'] }
];

const BOTTOM_ITEMS = [
  { subCategory: 'jeans',       color: 'blue',   colorFamily: 'cool',    material: 'denim',     styleType: 'casual',  occasion: 'casual',  weatherSuitability: ['normal', 'cold'] },
  { subCategory: 'trousers',    color: 'black',  colorFamily: 'neutral', material: 'polyester', styleType: 'formal',  occasion: 'office',  weatherSuitability: ['normal'] },
  { subCategory: 'leggings',    color: 'black',  colorFamily: 'neutral', material: 'cotton',    styleType: 'casual',  occasion: 'college', weatherSuitability: ['normal', 'cold'] },
  { subCategory: 'skirt',       color: 'navy',   colorFamily: 'dark',    material: 'polyester', styleType: 'party',   occasion: 'party',   weatherSuitability: ['normal'] },
  { subCategory: 'jeans',       color: 'grey',   colorFamily: 'neutral', material: 'denim',     styleType: 'casual',  occasion: 'college', weatherSuitability: ['normal'] },
  { subCategory: 'trousers',    color: 'beige',  colorFamily: 'neutral', material: 'cotton',    styleType: 'formal',  occasion: 'office',  weatherSuitability: ['hot', 'normal'] },
  { subCategory: 'palazzos',    color: 'maroon', colorFamily: 'earth',   material: 'cotton',    styleType: 'ethnic',  occasion: 'casual',  weatherSuitability: ['hot', 'normal'] },
  { subCategory: 'track-pants', color: 'grey',   colorFamily: 'neutral', material: 'synthetic', styleType: 'sporty',  occasion: 'casual',  weatherSuitability: ['normal', 'cold'] }
];

const SHOES_ITEMS = [
  { subCategory: 'sneakers',      footwearType: 'sneakers',      color: 'white',  colorFamily: 'neutral', material: 'canvas',    styleType: 'casual',  occasion: 'college', weatherSuitability: ['normal'] },
  { subCategory: 'flats',         footwearType: 'flats',         color: 'black',  colorFamily: 'neutral', material: 'leather',   styleType: 'formal',  occasion: 'office',  weatherSuitability: ['normal'] },
  { subCategory: 'heels',         footwearType: 'heels',         color: 'red',    colorFamily: 'warm',    material: 'synthetic', styleType: 'party',   occasion: 'party',   weatherSuitability: ['normal'] },
  { subCategory: 'sandals',       footwearType: 'sandals',       color: 'brown',  colorFamily: 'earth',   material: 'leather',   styleType: 'casual',  occasion: 'casual',  weatherSuitability: ['hot', 'normal'] },
  { subCategory: 'sneakers',      footwearType: 'sneakers',      color: 'blue',   colorFamily: 'cool',    material: 'canvas',    styleType: 'sporty',  occasion: 'college', weatherSuitability: ['normal'] },
  { subCategory: 'flats',         footwearType: 'flats',         color: 'beige',  colorFamily: 'neutral', material: 'leather',   styleType: 'classic', occasion: 'casual',  weatherSuitability: ['normal'] },
  { subCategory: 'loafers',       footwearType: 'loafers',       color: 'brown',  colorFamily: 'earth',   material: 'leather',   styleType: 'formal',  occasion: 'office',  weatherSuitability: ['normal', 'cold'] },
  { subCategory: 'sandals',       footwearType: 'sandals',       color: 'black',  colorFamily: 'neutral', material: 'synthetic', styleType: 'ethnic',  occasion: 'casual',  weatherSuitability: ['hot', 'normal'] }
];

const BAG_ITEMS = [
  { subCategory: 'handbag',    color: 'black',  colorFamily: 'neutral', material: 'leather',   styleType: 'formal',  occasion: 'office',  weatherSuitability: ['normal'] },
  { subCategory: 'tote',       color: 'brown',  colorFamily: 'earth',   material: 'canvas',    styleType: 'casual',  occasion: 'college', weatherSuitability: ['normal'] },
  { subCategory: 'backpack',   color: 'red',    colorFamily: 'warm',    material: 'synthetic', styleType: 'sporty',  occasion: 'college', weatherSuitability: ['normal', 'rainy'] },
  { subCategory: 'clutch',     color: 'gold',   colorFamily: 'warm',    material: 'satin',     styleType: 'party',   occasion: 'party',   weatherSuitability: ['normal'] },
  { subCategory: 'sling-bag',  color: 'navy',   colorFamily: 'dark',    material: 'leather',   styleType: 'casual',  occasion: 'casual',  weatherSuitability: ['normal'] },
  { subCategory: 'backpack',   color: 'grey',   colorFamily: 'neutral', material: 'canvas',    styleType: 'casual',  occasion: 'college', weatherSuitability: ['normal', 'rainy'] },
  { subCategory: 'handbag',    color: 'beige',  colorFamily: 'neutral', material: 'leather',   styleType: 'classic', occasion: 'office',  weatherSuitability: ['normal'] },
  { subCategory: 'tote',       color: 'green',  colorFamily: 'cool',    material: 'canvas',    styleType: 'casual',  occasion: 'casual',  weatherSuitability: ['normal'] }
];

const CATEGORY_ITEMS = {
  top: TOP_ITEMS,
  bottom: BOTTOM_ITEMS,
  shoes: SHOES_ITEMS,
  bag: BAG_ITEMS
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!\n');

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    let user = await User.findOne({ email: 'admin@gmail.com' });

    if (user) {
      console.log('Demo user already exists, deleting existing wardrobe items...');
      await WardrobeItem.deleteMany({ userId: user._id });
    } else {
      console.log('Creating demo admin user...');
      user = await User.create({
        name: 'Admin Demo',
        email: 'admin@gmail.com',
        password: 'Admin@123',
        gender: 'women',
        role: 'admin',
        preferences: { defaultOccasion: 'college', defaultWeather: 'normal' },
        weeklyTemplate: [
          { day: 'Monday', occasion: 'college' },
          { day: 'Tuesday', occasion: 'college' },
          { day: 'Wednesday', occasion: 'college' },
          { day: 'Thursday', occasion: 'college' },
          { day: 'Friday', occasion: 'office' },
          { day: 'Saturday', occasion: 'casual' },
          { day: 'Sunday', occasion: 'party' }
        ]
      });
      console.log(`Created user: ${user.email} (password: Admin@123)`);
    }

    console.log('\nLoading wardrobe items with DETAILED metadata...\n');

    const categories = ['top', 'bottom', 'shoes', 'bag'];
    let totalAdded = 0;

    for (const category of categories) {
      const categoryDir = path.join(DATASET_DIR, category);
      if (!fs.existsSync(categoryDir)) {
        console.log(`  ⚠ Category folder not found: ${category}`);
        continue;
      }

      const allFiles = fs.readdirSync(categoryDir)
        .filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'));

      const shuffled = allFiles.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, ITEMS_PER_CATEGORY);
      const metaList = CATEGORY_ITEMS[category];

      console.log(`  📦 ${category}: Loading ${selected.length} items...`);

      for (let i = 0; i < selected.length; i++) {
        const srcFile = selected[i];
        const srcPath = path.join(categoryDir, srcFile);

        const destName = `demo-${category}-${Date.now()}-${i}${path.extname(srcFile)}`;
        const destPath = path.join(UPLOAD_DIR, destName);
        fs.copyFileSync(srcPath, destPath);

        const meta = metaList[i % metaList.length];

        await WardrobeItem.create({
          userId: user._id,
          imageUrl: `/uploads/${destName}`,
          category,
          subCategory: meta.subCategory || '',
          gender: 'women',
          color: meta.color,
          colorFamily: meta.colorFamily || '',
          material: meta.material || '',
          styleType: meta.styleType || '',
          occasion: meta.occasion || 'all',
          weatherSuitability: meta.weatherSuitability || ['normal'],
          footwearType: meta.footwearType || '',
          tags: [category, meta.subCategory, meta.color, meta.occasion, 'women'].filter(Boolean),
          modelPrediction: {
            predictedCategory: category,
            confidence: 0.85 + Math.random() * 0.14
          },
          wornCount: 0,
          inLaundry: false
        });

        totalAdded++;
      }

      console.log(`     ✅ ${selected.length} ${category} items added with metadata`);
    }

    // Also delete any old weekly plans
    const WeeklyPlan = require('./models/WeeklyPlan');
    await WeeklyPlan.deleteMany({ userId: user._id });
    console.log('\n   🗑️  Cleared old weekly plans');

    console.log(`\n🎉 Seed complete! Total items added: ${totalAdded}`);
    console.log(`\n📧 Demo Login:`);
    console.log(`   Email: admin@gmail.com`);
    console.log(`   Password: Admin@123`);
    console.log(`   Gender: women`);
    console.log(`\n📊 Item Metadata:`);
    console.log(`   - Each item has: subCategory, color, colorFamily, material, styleType`);
    console.log(`   - Each item has: occasion, weatherSuitability, footwearType (shoes)`);
    console.log(`   - Recommendation engine will use ALL metadata for matching`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
