const express = require('express');
const router = express.Router();
const { getAutoWeather, getWeeklyWeather } = require('../services/weatherService');

// @desc    Get current weather (auto-detected)
// @route   GET /api/weather/current
router.get('/current', async (req, res) => {
  try {
    const result = await getAutoWeather();
    res.json(result);
  } catch (error) {
    res.status(500).json({ weather: 'normal', details: { temperature: 28, description: 'Clear' } });
  }
});

// @desc    Get weekly weather forecast
// @route   GET /api/weather/weekly
router.get('/weekly', async (req, res) => {
  try {
    const forecast = await getWeeklyWeather();
    res.json(forecast);
  } catch (error) {
    res.status(500).json([]);
  }
});

module.exports = router;
