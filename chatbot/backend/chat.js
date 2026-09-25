let express;
try {
  express = require('express');
} catch (e) {
  express = require('../../server/node_modules/express');
}
const router = express.Router();
const { protect } = require('../../server/middleware/auth');
const WardrobeItem = require('../../server/models/WardrobeItem');
const { getDailyRecommendations } = require('../../server/services/recommendationService');

// @desc    Chat with AI Stylist
// @route   POST /api/chat
router.post('/', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;
    const query = message.toLowerCase();

    // 1. Fetch wardrobe for context
    const allItems = await WardrobeItem.find({ userId: user._id });

    let response = "";

    // 2. Advanced Rule-based Chat Logic
    if (query.includes('wear') || query.includes('recommend') || query.includes('suggest') || query.includes('outfit')) {
      // Extract occasion
      const occasion = query.includes('party') ? 'party' : 
                       query.includes('office') ? 'office' : 
                       query.includes('college') ? 'college' : 
                       query.includes('ethnic') ? 'ethnic' : 'casual';
      
      // Extract weather intent
      let weather = 'normal';
      if (query.includes('hot') || query.includes('summer')) weather = 'hot';
      else if (query.includes('cold') || query.includes('winter')) weather = 'cold';
      else if (query.includes('rain')) weather = 'rainy';
      
      const recs = getDailyRecommendations(allItems, user.gender, occasion, weather, 1);
      
      if (recs.outfits.length > 0) {
        const outfit = recs.outfits[0];
        const weatherText = weather !== 'normal' ? ` considering the ${weather} weather outside` : '';
        response = `Ooh, I have the perfect ${occasion} look for you${weatherText}! 👗 I recommend pairing your ${outfit.top.color} ${outfit.top.subCategory || outfit.top.category} with those ${outfit.bottom.color} ${outfit.bottom.subCategory || outfit.bottom.category}. Finishing it off with your ${outfit.shoes.subCategory || outfit.shoes.category} will really tie it all together. You're going to look stunning! ✨`;
      } else {
        response = `I'd love to help you find a ${occasion} outfit, but it looks like we're a bit short on matching items right now. Maybe try adding some new pieces or check if your favorites are waiting in the laundry? 🧺`;
      }
    } 
    else if (query.includes('weather') || query.includes('temperature')) {
      response = "I always take the local weather into account when recommending outfits! You can ask me 'What should I wear for a rainy day?' or 'Suggest a summer outfit' to see it in action.";
    }
    else if (query.includes('laundry') || query.includes('dirty') || query.includes('wash')) {
      const laundryCount = allItems.filter(i => i.inLaundry).length;
      if (laundryCount > 0) {
        response = `You have ${laundryCount} items in laundry right now. I'm keeping them out of your recommendations until they're clean!`;
      } else {
        response = "Your wardrobe is fully clean! Every item is available for your next great look.";
      }
    }
    // ════════════════════════════════════════════════════
    // 4. Default Personality Responses
    // ════════════════════════════════════════════════════
    else {
      const personalityResponses = [
        "I'm here to help you look your absolute best! What's on your mind?",
        "Fashion is about expressing yourself. How can I help you express your style today?",
        "I've analyzed your wardrobe and I'm ready with some fresh ideas. Ask me anything!",
        "Looking for something specific? I can help you pick the perfect outfit for any weather or occasion.",
        "Hello! I'm your personal AI stylist. I can manage your wardrobe, suggest outfits, or even tell you if it's too cold for that tank top!"
      ];

      if (query.includes('hello') || query.includes('hi ') || query.includes('who are you')) {
        response = personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
      } else if (query.includes('thank')) {
        response = "You're very welcome! Stay stylish. ✨";
      } else if (query.includes('wear') || query.includes('suggest') || query.includes('outfit')) {
        response = "I'd love to help! Tell me: what's the occasion (office, party, casual) and how's the weather? Or just check your Daily Recommendations on the dashboard!";
      } else {
        response = "That's a great question! As your stylist, I recommend checking your dashboard for a personalized look, or ask me something specific like 'what should I wear for a party?'";
      }
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'I hit a little snag in my styling book. Try again?' });
  }
});

module.exports = router;
