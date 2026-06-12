const axios = require('axios');

/**
 * Auto-detect weather based on IP geolocation + weather API
 * Uses free wttr.in service (no API key needed)
 */
async function getAutoWeather() {
  try {
    // Use wttr.in free weather API (no key required)
    const response = await axios.get('https://wttr.in/?format=j1', {
      timeout: 5000,
      headers: { 'User-Agent': 'AI-Stylist-App' }
    });

    if (response.data && response.data.current_condition) {
      const current = response.data.current_condition[0];
      const tempC = parseFloat(current.temp_C);
      const humidity = parseFloat(current.humidity);
      const weatherDesc = (current.weatherDesc?.[0]?.value || '').toLowerCase();
      const precipMM = parseFloat(current.precipMM || 0);

      // Classify into our weather categories
      let weather = 'normal';
      let details = {};

      if (precipMM > 1 || weatherDesc.includes('rain') || weatherDesc.includes('drizzle') || weatherDesc.includes('shower')) {
        weather = 'rainy';
      } else if (tempC >= 35) {
        weather = 'hot';
      } else if (tempC <= 15) {
        weather = 'cold';
      } else {
        weather = 'normal';
      }

      details = {
        temperature: tempC,
        humidity: humidity,
        description: current.weatherDesc?.[0]?.value || 'Clear',
        feelsLike: parseFloat(current.FeelsLikeC || tempC),
        windSpeed: parseFloat(current.windspeedKmph || 0),
        weatherCode: current.weatherCode,
        icon: getWeatherIcon(weather)
      };

      // Get location info
      const area = response.data.nearest_area?.[0];
      if (area) {
        details.city = area.areaName?.[0]?.value || '';
        details.region = area.region?.[0]?.value || '';
        details.country = area.country?.[0]?.value || '';
      }

      return { weather, details };
    }
  } catch (error) {
    console.log('Weather API error (using default):', error.message);
  }

  // Fallback
  return {
    weather: 'normal',
    details: {
      temperature: 28,
      humidity: 60,
      description: 'Clear',
      feelsLike: 28,
      city: '',
      icon: '☀️'
    }
  };
}

/**
 * Get weather forecast for the week
 */
async function getWeeklyWeather() {
  try {
    const response = await axios.get('https://wttr.in/?format=j1', {
      timeout: 5000,
      headers: { 'User-Agent': 'AI-Stylist-App' }
    });

    if (response.data && response.data.weather) {
      const forecasts = response.data.weather;
      const weekWeather = [];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      // Get today's day index
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = days[date.getDay()];

        // Use forecast data if available, else use day 0 forecast
        const forecastIdx = Math.min(i, forecasts.length - 1);
        const forecast = forecasts[forecastIdx];

        const avgTemp = parseFloat(forecast.avgtempC || 28);
        const maxTemp = parseFloat(forecast.maxtempC || 30);
        const minTemp = parseFloat(forecast.mintempC || 20);
        const totalPrecip = forecast.hourly?.reduce((sum, h) => sum + parseFloat(h.precipMM || 0), 0) || 0;

        let weather = 'normal';
        if (totalPrecip > 5) weather = 'rainy';
        else if (maxTemp >= 35) weather = 'hot';
        else if (minTemp <= 15) weather = 'cold';

        weekWeather.push({
          day: dayName,
          date: date.toISOString().split('T')[0],
          weather,
          temperature: avgTemp,
          maxTemp,
          minTemp,
          icon: getWeatherIcon(weather)
        });
      }

      return weekWeather;
    }
  } catch (error) {
    console.log('Weekly weather API error:', error.message);
  }

  // Fallback
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days.map(day => ({
    day,
    weather: 'normal',
    temperature: 28,
    icon: '☀️'
  }));
}

function getWeatherIcon(weather) {
  const icons = { hot: '🌡️', cold: '❄️', rainy: '🌧️', normal: '☀️' };
  return icons[weather] || '☀️';
}

module.exports = { getAutoWeather, getWeeklyWeather };
