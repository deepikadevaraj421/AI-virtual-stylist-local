const express = require('express');
const router = express.Router();
const {
  getWeeklyPlan, generatePlan, updateDay, completeLaundry, markDayWorn
} = require('../controllers/weeklyPlanController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getWeeklyPlan);
router.post('/generate', generatePlan);
router.put('/day', updateDay);
router.post('/laundry', completeLaundry);
router.post('/worn', markDayWorn);

module.exports = router;
