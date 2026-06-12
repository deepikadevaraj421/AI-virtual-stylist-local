const express = require('express');
const router = express.Router();
const {
  getDailyTop5, markAsWorn, saveFavorite, getFavorites, getHistory
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/daily', getDailyTop5);
router.post('/worn', markAsWorn);
router.post('/favorite', saveFavorite);
router.get('/favorites', getFavorites);
router.get('/history', getHistory);

module.exports = router;
