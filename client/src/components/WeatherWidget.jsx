import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, Card } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';

const WeatherWidget = ({ transparentBackground, weatherApiKey, widgetSize = { width: 4, height: 4 } }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [airQualityData, setAirQualityData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('temperature');

  // Determine layout based on widget size OR manual override
  const getLayoutType = () => {
    // Check for manual layout mode override
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const layoutMode = widgetSettings.weather?.layoutMode;
    
    if (layoutMode && layoutMode !== 'auto') {
      return layoutMode;
    }
    
    // Auto-calculate based on size
    const { width: w, height: h } = widgetSize;
    
    // Compact: Small widgets (2 cols or less, 2 rows or less)
    if (w <= 2 || h <= 2) {
      return 'compact';
    }
    
    // Medium: Medium-sized widgets (3 cols, 2-4 rows OR 4 cols, 2-3 rows)
    if ((w === 3 && h >= 2 && h <= 4) || (w === 4 && h >= 2 && h <= 3)) {
      return 'medium';
    }
    
    // Full: Large widgets (4+ cols and 4+ rows)
    if (w >= 4 && h >= 4) {
      return 'full';
    }
    
    // Default to medium for edge cases
    return 'medium';
  };

  const layoutType = getLayoutType();

  useEffect(() => {
    // Load zip code from API settings
    const loadZipCode = async () => {
      try {
        const response = await axios.get(`${getApiUrl()}/api/settings`);
        const settings = response.data;
        const savedZipCode = settings.WEATHER_ZIP_CODE || '14818';
        setZipCode(savedZipCode);
      } catch (error) {
        console.error('Error loading weather zip code:', error);
        // Fallback to default
        const defaultZip = '14818';
        setZipCode(defaultZip);
      }
    };
    loadZipCode();
  }, []);

  useEffect(() => {
    if (zipCode && weatherApiKey) {
      setError(null); // Clear any previous errors when API key is provided
      fetchWeatherData();
    } else if (!weatherApiKey && zipCode) {
      setError('Weather API key not configured. Please add your OpenWeatherMap API key in the Admin Panel.');
    }
  }, [zipCode, weatherApiKey]);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.weather?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        if (zipCode && weatherApiKey) {
          fetchWeatherData();
        }
      }, refreshInterval);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [zipCode, weatherApiKey]);

  const fetchWeatherData = async () => {
    if (!weatherApiKey) {
      setError('Weather API key not configured. Please add your OpenWeatherMap API key in the Admin Panel.');
      return;
    }

    if (!zipCode) {
      setError('Please enter a zip code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?zip=${zipCode},US&appid=${weatherApiKey}&units=imperial`;
      const currentResponse = await axios.get(currentWeatherUrl);
      setWeatherData(currentResponse.data);

      if (currentResponse.data.coord) {
        const { lat, lon } = currentResponse.data.coord;
        const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${weatherApiKey}`;
        
        try {
          const airQualityResponse = await axios.get(airQualityUrl);
          setAirQualityData(airQualityResponse.data);
        } catch (airError) {
          setAirQualityData(null);
        }
      }

      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?zip=${zipCode},US&appid=${weatherApiKey}&units=imperial`;
      const forecastResponse = await axios.get(forecastUrl);

      const dailyForecasts = [];
      const chartDataPoints = [];
      
      if (forecastResponse.data && forecastResponse.data.list) {
        const forecastByDay = {};
        
        forecastResponse.data.list.slice(0, 24).forEach((item, index) => {
          const date = new Date(item.dt * 1000);
          const dayKey = date.toDateString();
          
          if (!forecastByDay[dayKey]) {
            forecastByDay[dayKey] = {
              date: date,
              temps: {
                min: item.main.temp_min,
                max: item.main.temp_max,
                all: []
              },
              weather: item.weather[0],
              precipitation: item.rain ? item.rain['3h'] || 0 : 0
            };
          } else {
            forecastByDay[dayKey].temps.min = Math.min(forecastByDay[dayKey].temps.min, item.main.temp_min);
            forecastByDay[dayKey].temps.max = Math.max(forecastByDay[dayKey].temps.max, item.main.temp_max);
          }
          
          forecastByDay[dayKey].temps.all.push(item.main.temp);
          
          if (index < 8) {
            chartDataPoints.push({
              time: date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
              temperature: Math.round(item.main.temp),
              precipitation: item.rain ? item.rain['3h'] || 0 : 0
            });
          }
        });

        const dailyForecastArray = Object.values(forecastByDay).slice(0, 3).map(day => ({
          date: day.date,
          dayName: day.date.toLocaleDateString('en-US', { weekday: 'short' }),
          tempHigh: Math.round(day.temps.max),
          tempLow: Math.round(day.temps.min),
          tempAvg: Math.round(day.temps.all.reduce((a, b) => a + b, 0) / day.temps.all.length),
          weather: day.weather,
          precipitation: day.precipitation
        }));
        
        setForecastData(dailyForecastArray);
        setChartData(chartDataPoints);
      }

    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          setError('Invalid API key. Please check your OpenWeatherMap API key in the Admin Panel.');
        } else if (error.response.status === 404) {
          setError('Invalid zip code. Please enter a valid US zip code.');
        } else {
          setError(`Weather service error: ${error.response.status} ${error.response.statusText}`);
        }
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        setError('Unable to connect to weather service. Please check your internet connection.');
      } else {
        setError('Failed to fetch weather data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAirQualityLevel = (aqi) => {
    const levels = {
      1: { label: 'Good', color: '#00e400', emoji: '😊' },
      2: { label: 'Fair', color: '#ffff00', emoji: '😐' },
      3: { label: 'Moderate', color: '#ff7e00', emoji: '😷' },
      4: { label: 'Poor', color: '#ff0000', emoji: '😨' },
      5: { label: 'Very Poor', color: '#8f3f97', emoji: '🤢' }
    };
    return levels[aqi] || { label: 'Unknown', color: 'var(--text-secondary)', emoji: '❓' };
  };

  // Zip code is now managed in Admin Panel

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
  };

  // Compact Layout - Current weather only
  const renderCompactLayout = () => {
    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2 // Increased from 1 (8px) to 2 (16px) for better spacing
      }}>
        <Typography variant="h2" sx={{ fontSize: '3rem', mb: 1.5 }}> {/* Increased from mb: 1 */}
          {getWeatherIcon(weatherData.weather[0].icon)}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}> {/* Increased from mb: 0.5 */}
          {Math.round(weatherData.main.temp)}°F
        </Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', textTransform: 'capitalize', mb: 1 }}> {/* Increased from mb: 0.5 */}
          {weatherData.weather[0].description}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          {weatherData.name}
        </Typography>
      </Box>
    );
  };

  // Medium Layout - Current weather + 3-day forecast
  const renderMediumLayout = () => {
    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        gap: 'var(--spacing-md)'
      }}>
        {/* Current Weather */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <Typography variant="h1" sx={{ fontSize: '3rem' }}>
            {getWeatherIcon(weatherData.weather[0].icon)}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              {Math.round(weatherData.main.temp)}°F
            </Typography>
            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
              {weatherData.weather[0].description}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Feels like {Math.round(weatherData.main.feels_like)}°F
            </Typography>
          </Box>
        </Box>

        {/* 3-Day Forecast */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            3-Day Forecast
          </Typography>
          {forecastData.map((day, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--border-radius-small)',
                bgcolor: 'rgba(var(--accent-rgb), 0.05)'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 40 }}>
                {day.dayName}
              </Typography>
              <Typography variant="h6" sx={{ fontSize: '1.5rem' }}>
                {getWeatherIcon(day.weather.icon)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, minWidth: 80, justifyContent: 'flex-end' }}>
                <Typography variant="body2" sx={{ color: 'var(--gradient-end)', fontWeight: 'bold' }}>
                  {day.tempHigh}°
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--gradient-start)' }}>
                  {day.tempLow}°
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Full Layout - All information
  const renderFullLayout = () => {
    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2
      }}>
        <Box sx={{ display: 'flex', gap: 'var(--spacing-lg)', flex: 1, minHeight: 0, alignItems: 'center' }}>
          {/* Current Weather - Left Column */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ fontSize: '3rem', mb: 1 }}>
              {getWeatherIcon(weatherData.weather[0].icon)}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {Math.round(weatherData.main.temp)}°F
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
              {weatherData.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center', textTransform: 'capitalize' }}>
              {weatherData.weather[0].description}
            </Typography>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Feels like {Math.round(weatherData.main.feels_like)}°F
              </Typography>
              <Typography variant="body2">
                Humidity: {weatherData.main.humidity}%
              </Typography>
              <Typography variant="body2">
                Wind: {Math.round(weatherData.wind.speed)} mph
              </Typography>
            </Box>

            {/* Air Quality Box */}
            {airQualityData && (
              <Box 
                sx={{ 
                  mt: 3,
                  p: 2,
                  width: '90%',
                  alignSelf: 'center',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--border-radius-medium)',
                  bgcolor: 'rgba(var(--accent-rgb), 0.05)',
                  textAlign: 'center'
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Air Quality
                </Typography>
                {(() => {
                  const aqi = airQualityData.list[0].main.aqi;
                  const aqiInfo = getAirQualityLevel(aqi);
                  return (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
                            {aqiInfo.emoji}
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: aqiInfo.color,
                              mb: 0.5
                            }}
                          >
                            {aqiInfo.label}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            AQI: {aqi}/5
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: '0.75rem' }}>
                          <Typography variant="caption">
                            PM2.5: {Math.round(airQualityData.list[0].components.pm2_5)}
                          </Typography>
                          <Typography variant="caption">
                            PM10: {Math.round(airQualityData.list[0].components.pm10)}
                          </Typography>
                          <Typography variant="caption">
                            O₃: {Math.round(airQualityData.list[0].components.o3)}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  );
                })()}
              </Box>
            )}
          </Box>

          {/* 3-Day Forecast - Middle Column */}
          <Box sx={{ flex: 0.7, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              3-Day Forecast
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
              {forecastData.map((day, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2.5,
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--border-radius-small)',
                    bgcolor: 'rgba(var(--accent-rgb), 0.05)',
                    minHeight: 120
                  }}
                >
                  {/* Top Row: Day Name (left) and Date (right) */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {day.dayName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Typography>
                  </Box>
                  
                  {/* Bottom Row: Temps (left) and Weather (right) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'var(--gradient-end)' }}>
                        {day.tempHigh}°F
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--gradient-start)' }}>
                        {day.tempLow}°F
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h5">
                        {getWeatherIcon(day.weather.icon)}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {day.weather.description}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Charts - Right Column */}
          <Box sx={{ flex: 1.3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, justifyContent: 'center', width: '100%' }}>
              <Button
                size="small"
                variant={chartType === 'temperature' ? 'contained' : 'outlined'}
                onClick={() => setChartType('temperature')}
                sx={{
                  backgroundColor: chartType === 'temperature' ? 'rgba(var(--primary-rgb), 0.12)' : 'rgba(var(--primary-rgb), 0.12)',
                  color: chartType === 'temperature' ? 'var(--primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--elevation-1)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                    color: 'var(--primary)',
                    borderColor: 'var(--primary)',
                    boxShadow: 'var(--elevation-2)'
                  }
                }}
              >
                🌡️
              </Button>
              <Button
                size="small"
                variant={chartType === 'precipitation' ? 'contained' : 'outlined'}
                onClick={() => setChartType('precipitation')}
                sx={{
                  backgroundColor: chartType === 'precipitation' ? 'rgba(var(--primary-rgb), 0.12)' : 'rgba(var(--primary-rgb), 0.12)',
                  color: chartType === 'precipitation' ? 'var(--primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--elevation-1)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                    color: 'var(--primary)',
                    borderColor: 'var(--primary)',
                    boxShadow: 'var(--elevation-2)'
                  }
                }}
              >
                🌧️
              </Button>
            </Box>

            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'temperature' ? (
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false}
                      interval="preserveStartEnd"
                      tick={{ 
                        fill: 'var(--text-secondary)',
                        fontSize: 'clamp(0.6rem, 1vw, 0.75rem)'
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      width={50}
                      tick={{ 
                        fill: 'var(--text-secondary)',
                        fontSize: 'clamp(0.6rem, 1vw, 0.75rem)'
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card-bg)', 
                        border: '1px solid var(--card-border)',
                        color: 'var(--text)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="var(--primary)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--primary)' }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false}
                      interval="preserveStartEnd"
                      tick={{ 
                        fill: 'var(--text-secondary)',
                        fontSize: 'clamp(0.6rem, 1vw, 0.75rem)'
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      width={50}
                      tick={{ 
                        fill: 'var(--text-secondary)',
                        fontSize: 'clamp(0.6rem, 1vw, 0.75rem)'
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card-bg)', 
                        border: '1px solid var(--card-border)',
                        color: 'var(--text)'
                      }}
                    />
                    <Bar dataKey="precipitation" fill="var(--secondary)" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Card sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: transparentBackground ? 'transparent' : 'var(--card-bg)',
        border: transparentBackground ? 'none' : '1px solid var(--card-border)',
        boxShadow: transparentBackground ? 'none' : 'var(--elevation-1)'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '2px solid var(--primary)',
          background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)',
          backgroundSize: '100% 3px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.95rem'
          }}>
            🌤️ Weather
          </Typography>
        </Box>
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2
        }}>
          <Typography>Loading weather data...</Typography>
        </Box>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: transparentBackground ? 'transparent' : 'var(--card-bg)',
        border: transparentBackground ? 'none' : '1px solid var(--card-border)',
        boxShadow: transparentBackground ? 'none' : 'var(--elevation-1)'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '2px solid var(--primary)',
          background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)',
          backgroundSize: '100% 3px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.95rem'
          }}>
            🌤️ Weather
          </Typography>
        </Box>
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2
        }}>
          <Box sx={{ p: 2, bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: 'var(--border-radius-small)', mb: 2 }}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </Box>
          {layoutType !== 'compact' && (
            <Typography variant="body2" color="text.secondary">
              {zipCode || 'Zip code not set'}
            </Typography>
          )}
        </Box>
      </Card>
    );
  }

  if (!weatherData) {
    return (
      <Card sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: transparentBackground ? 'transparent' : 'var(--card-bg)',
        border: transparentBackground ? 'none' : '1px solid var(--card-border)',
        boxShadow: transparentBackground ? 'none' : 'var(--elevation-1)'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '2px solid var(--primary)',
          background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)',
          backgroundSize: '100% 3px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.95rem'
          }}>
            🌤️ Weather
          </Typography>
        </Box>
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2
        }}>
          <Typography>No weather data available</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: transparentBackground ? 'transparent' : 'var(--card-bg)',
      border: transparentBackground ? 'none' : '1px solid var(--card-border)',
      boxShadow: transparentBackground ? 'none' : 'var(--elevation-1)',
      overflow: 'hidden'
    }}>
      {/* Header with gradient border */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '2px solid var(--primary)',
        background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)',
        backgroundSize: '100% 3px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'bottom'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.95rem'
          }}>
            🌤️ Weather
          </Typography>
          {layoutType !== 'compact' && (
            <Typography variant="body2" color="text.secondary">
              {zipCode || 'Zip code not set'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Dynamic Content Based on Layout */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {layoutType === 'compact' && renderCompactLayout()}
        {layoutType === 'medium' && renderMediumLayout()}
        {layoutType === 'full' && renderFullLayout()}
      </Box>
    </Card>
  );
};

export default WeatherWidget;
