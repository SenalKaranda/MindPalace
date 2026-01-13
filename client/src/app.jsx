// client/src/app.jsx
import React, { useState, useEffect } from 'react';
import { Container, IconButton, Box, Dialog, DialogContent, Typography, Tooltip } from '@mui/material';
import { Brightness4, Brightness7, Lock, LockOpen } from '@mui/icons-material';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';

import axios from 'axios';
import CalendarWidget from './components/CalendarWidget.jsx';
import PhotoWidget from './components/PhotoWidget.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import WeatherWidget from './components/WeatherWidget.jsx';
import ChoreWidget from './components/ChoreWidget.jsx';
import TodoWidget from './components/TodoWidget.jsx';
import NotesWidget from './components/NotesWidget.jsx';
import AlarmWidget from './components/AlarmWidget.jsx';
import HouseRulesWidget from './components/HouseRulesWidget.jsx';
import MarbleChartWidget from './components/MarbleChartWidget.jsx';
import GroceryListWidget from './components/GroceryListWidget.jsx';
import MealPlannerWidget from './components/MealPlannerWidget.jsx';
import MealSuggestionBoxWidget from './components/MealSuggestionBoxWidget.jsx';
import WidgetGallery from './components/WidgetGallery.jsx';
import WidgetContainer from './components/WidgetContainer.jsx';
import { getApiUrl } from './utils/api.js';
import { loadThemeSettings, applyThemeSettings } from './utils/theme.js';
import './index.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2,
          p: 4
        }}>
          <Typography variant="h5" sx={{ color: 'var(--error)' }}>
            Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text)', opacity: 0.7, mt: 2 }}>
            Check the browser console for more details
          </Typography>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </Box>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const [theme, setTheme] = useState('light');
  const [widgetsLocked, setWidgetsLocked] = useState(() => {
    const saved = localStorage.getItem('widgetsLocked');
    return saved !== null ? JSON.parse(saved) : true; // Default to locked
  });
  const [widgetSettings, setWidgetSettings] = useState(() => {
    const defaultSettings = {
      chores: { enabled: false, transparent: false },
      calendar: { enabled: false, transparent: false },
      photos: { enabled: false, transparent: false },
      weather: { enabled: false, transparent: false },
      todos: { enabled: false, transparent: false },
      notes: { enabled: false, transparent: false },
      groceryList: { enabled: false, transparent: false },
      mealPlanner: { enabled: false, transparent: false },
      mealSuggestionBox: { enabled: false, transparent: false },
      widgetGallery: { enabled: true, transparent: false },
      lightGradientStart: '#00ddeb',
      lightGradientEnd: '#ff6b6b',
      darkGradientStart: '#2e2767',
      darkGradientEnd: '#620808',
      lightButtonGradientStart: '#00ddeb',
      lightButtonGradientEnd: '#ff6b6b',
      darkButtonGradientStart: '#2e2767',
      darkButtonGradientEnd: '#620808',
    };
    try {
      const savedSettings = localStorage.getItem('widgetSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Ensure all widget settings have the required structure
        return {
          ...defaultSettings,
          ...parsed,
          chores: { ...defaultSettings.chores, ...parsed.chores },
          calendar: { ...defaultSettings.calendar, ...parsed.calendar },
          photos: { ...defaultSettings.photos, ...parsed.photos },
          weather: { ...defaultSettings.weather, ...parsed.weather },
          todos: { ...defaultSettings.todos, ...parsed.todos },
          notes: { ...defaultSettings.notes, ...parsed.notes },
          groceryList: { ...defaultSettings.groceryList, ...parsed.groceryList },
          mealPlanner: { ...defaultSettings.mealPlanner, ...parsed.mealPlanner },
          mealSuggestionBox: { ...defaultSettings.mealSuggestionBox, ...parsed.mealSuggestionBox },
          widgetGallery: { ...defaultSettings.widgetGallery, ...parsed.widgetGallery },
        };
      }
    } catch (error) {
      console.error('Error parsing widget settings from localStorage:', error);
    }
    return defaultSettings;
  });
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [currentGeoPatternSeed, setCurrentGeoPatternSeed] = useState('');
  const [apiKeys, setApiKeys] = useState({
    WEATHER_API_KEY: '',
    ICS_CALENDAR_URL: '',
    LOGO_FILENAME: 'MindPalaceMobileLogo.png',
  });
  const [widgetGalleryKey, setWidgetGalleryKey] = useState(0);

  const refreshWidgetGallery = () => {
    setWidgetGalleryKey(prev => prev + 1);
  };

  // Function to refresh API keys from backend
  const refreshApiKeys = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/settings`);
      setApiKeys(response.data);
      console.log('API keys refreshed:', response.data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  };

  useEffect(() => {
    refreshApiKeys();
  }, []);

  useEffect(() => {
    // Theme is already applied in main.jsx, but we need to sync React state
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const currentDataTheme = document.documentElement.getAttribute('data-theme');
    
    // Only re-apply if theme changed or wasn't set
    if (currentDataTheme !== savedTheme) {
      console.log('[App] Theme mismatch detected, re-applying theme');
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      const themeSettings = loadThemeSettings();
      applyThemeSettings(themeSettings, savedTheme);
    } else {
      console.log('[App] Theme already applied, syncing React state only');
      setTheme(savedTheme);
    }
    
    setCurrentGeoPatternSeed(Math.random().toString());
    
    // Listen for theme updates from AdminPanel
    const handleThemeUpdate = (event) => {
      console.log('[App] Theme updated event received', event.detail);
      const { theme: updatedTheme, settings } = event.detail;
      if (updatedTheme === savedTheme) {
        // Re-apply theme settings if they changed
        applyThemeSettings(settings, updatedTheme, false);
      }
    };
    
    window.addEventListener('themeUpdated', handleThemeUpdate);
    return () => window.removeEventListener('themeUpdated', handleThemeUpdate);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--light-gradient-start', widgetSettings.lightGradientStart);
    document.documentElement.style.setProperty('--light-gradient-end', widgetSettings.lightGradientEnd);
    document.documentElement.style.setProperty('--dark-gradient-start', widgetSettings.darkGradientStart);
    document.documentElement.style.setProperty('--dark-gradient-end', widgetSettings.darkGradientEnd);
    document.documentElement.style.setProperty('--light-button-gradient-start', widgetSettings.lightButtonGradientStart);
    document.documentElement.style.setProperty('--light-button-gradient-end', widgetSettings.lightButtonGradientEnd);
    document.documentElement.style.setProperty('--dark-button-gradient-start', widgetSettings.darkButtonGradientStart);
    document.documentElement.style.setProperty('--dark-button-gradient-end', widgetSettings.darkButtonGradientEnd);
    document.documentElement.style.setProperty('--bottom-bar-height', '60px');
  }, [widgetSettings]);

  // Listen for localStorage changes to widget settings (for cross-tab sync and AdminPanel updates)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'widgetSettings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const defaultSettings = {
            chores: { enabled: false, transparent: false },
            calendar: { enabled: false, transparent: false },
            photos: { enabled: false, transparent: false },
            weather: { enabled: false, transparent: false },
            widgetGallery: { enabled: true, transparent: false },
            lightGradientStart: '#00ddeb',
            lightGradientEnd: '#ff6b6b',
            darkGradientStart: '#2e2767',
            darkGradientEnd: '#620808',
            lightButtonGradientStart: '#00ddeb',
            lightButtonGradientEnd: '#ff6b6b',
            darkButtonGradientStart: '#2e2767',
            darkButtonGradientEnd: '#620808',
          };
          setWidgetSettings({ ...defaultSettings, ...parsed });
        } catch (error) {
          console.error('Error parsing widget settings from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme settings for the new theme
    const themeSettings = loadThemeSettings();
    applyThemeSettings(themeSettings, newTheme);
  };

  const toggleWidgetsLock = () => {
    const newLockState = !widgetsLocked;
    setWidgetsLocked(newLockState);
    localStorage.setItem('widgetsLocked', JSON.stringify(newLockState));
  };

  const toggleAdminPanel = () => {
    if (showAdminPanel) {
      // When closing AdminPanel, refresh widget settings and API keys
      const savedSettings = localStorage.getItem('widgetSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setWidgetSettings(prev => ({ ...prev, ...parsed }));
      }
      // Always refresh API keys when closing AdminPanel in case they were updated
      refreshApiKeys();
    }
    setShowAdminPanel(!showAdminPanel);
  };

  const handlePageRefresh = () => {
    window.location.reload();
  };

  // Find nearest open space for widget positioning
  const findNearestOpenSpace = (widgetWidth, widgetHeight, existingWidgets) => {
    const gridCols = 12; // Match WidgetContainer grid
    const maxY = 50; // Reasonable max height
    
    // Get all existing widget positions from localStorage
    const existingPositions = existingWidgets.map(widget => {
      const saved = localStorage.getItem(`widget-layout-${widget.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            x: parsed.x || widget.defaultPosition?.x || 0,
            y: parsed.y || widget.defaultPosition?.y || 0,
            w: parsed.w || widget.defaultSize?.width || 4,
            h: parsed.h || widget.defaultSize?.height || 4
          };
        } catch (e) {
          return {
            x: widget.defaultPosition?.x || 0,
            y: widget.defaultPosition?.y || 0,
            w: widget.defaultSize?.width || 4,
            h: widget.defaultSize?.height || 4
          };
        }
      }
      return {
        x: widget.defaultPosition?.x || 0,
        y: widget.defaultPosition?.y || 0,
        w: widget.defaultSize?.width || 4,
        h: widget.defaultSize?.height || 4
      };
    });

    // Check if position overlaps with existing widgets
    const overlaps = (x, y, w, h, existing) => {
      return existing.some(pos => {
        return !(x + w <= pos.x || x >= pos.x + pos.w || y + h <= pos.y || y >= pos.y + pos.h);
      });
    };

    // Scan from top-left
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x <= gridCols - widgetWidth; x++) {
        if (!overlaps(x, y, widgetWidth, widgetHeight, existingPositions)) {
          return { x, y };
        }
      }
    }

    // If no space found, return null (will use fallback)
    return null;
  };

  const buildWidgetsArray = () => {
    const widgets = [];

    try {
      if (widgetSettings.calendar?.enabled) {
        widgets.push({
          id: 'calendar-widget',
          defaultPosition: { x: 0, y: 0 },
          defaultSize: { width: 8, height: 5 },
          minWidth: 2,
          minHeight: 2,
          content: <CalendarWidget
            transparentBackground={widgetSettings.calendar?.transparent || false}
            icsCalendarUrl={apiKeys.ICS_CALENDAR_URL || ''}
          />,
        });
      }

      if (widgetSettings.weather?.enabled) {
        widgets.push({
          id: 'weather-widget',
          defaultPosition: { x: 8, y: 0 },
          defaultSize: { width: 4, height: 3 },
          minWidth: 2,
          minHeight: 2,
          content: <WeatherWidget
            transparentBackground={widgetSettings.weather?.transparent || false}
            weatherApiKey={apiKeys.WEATHER_API_KEY || ''}
          />,
        });
      }

      if (widgetSettings.chores?.enabled) {
        widgets.push({
          id: 'chores-widget',
          defaultPosition: { x: 0, y: 5 },
          defaultSize: { width: 6, height: 4 },
          minWidth: 2,
          minHeight: 2,
          content: <ChoreWidget transparentBackground={widgetSettings.chores?.transparent || false} />,
        });
      }

      if (widgetSettings.photos?.enabled) {
        widgets.push({
          id: 'photos-widget',
          defaultPosition: { x: 6, y: 5 },
          defaultSize: { width: 6, height: 4 },
          minWidth: 2,
          minHeight: 2,
          content: <PhotoWidget transparentBackground={widgetSettings.photos?.transparent || false} />,
        });
      }

      if (widgetSettings.todos?.enabled) {
        widgets.push({
          id: 'todos-widget',
          defaultPosition: { x: 0, y: 9 },
          defaultSize: { width: 6, height: 5 },
          minWidth: 3,
          minHeight: 3,
          content: <TodoWidget transparentBackground={widgetSettings.todos?.transparent || false} />,
        });
      }

      if (widgetSettings.notes?.enabled) {
        widgets.push({
          id: 'notes-widget',
          defaultPosition: { x: 6, y: 9 },
          defaultSize: { width: 6, height: 5 },
          minWidth: 3,
          minHeight: 3,
          content: <NotesWidget transparentBackground={widgetSettings.notes?.transparent || false} />,
        });
      }

      // New widgets with smart positioning
      if (widgetSettings.alarms?.enabled) {
        const widgetId = 'alarms-widget';
        const savedLayout = localStorage.getItem(`widget-layout-${widgetId}`);
        let position = null;
        
        if (!savedLayout) {
          // Find nearest open space
          position = findNearestOpenSpace(4, 4, widgets);
          if (position) {
            // Save immediately
            localStorage.setItem(`widget-layout-${widgetId}`, JSON.stringify({
              x: position.x,
              y: position.y,
              w: 4,
              h: 4
            }));
          }
        }

        widgets.push({
          id: widgetId,
          defaultPosition: position || null,
          defaultSize: { width: 4, height: 4 },
          minWidth: 3,
          minHeight: 2,
          content: <AlarmWidget transparentBackground={widgetSettings.alarms?.transparent || false} />,
        });
      }

      if (widgetSettings.houseRules?.enabled) {
        const widgetId = 'house-rules-widget';
        const savedLayout = localStorage.getItem(`widget-layout-${widgetId}`);
        let position = null;
        
        if (!savedLayout) {
          position = findNearestOpenSpace(4, 4, widgets);
          if (position) {
            localStorage.setItem(`widget-layout-${widgetId}`, JSON.stringify({
              x: position.x,
              y: position.y,
              w: 4,
              h: 4
            }));
          }
        }

        widgets.push({
          id: widgetId,
          defaultPosition: position || null,
          defaultSize: { width: 4, height: 4 },
          minWidth: 3,
          minHeight: 2,
          content: <HouseRulesWidget transparentBackground={widgetSettings.houseRules?.transparent || false} />,
        });
      }

      if (widgetSettings.marbles?.enabled) {
        const widgetId = 'marbles-widget';
        const savedLayout = localStorage.getItem(`widget-layout-${widgetId}`);
        let position = null;
        
        if (!savedLayout) {
          position = findNearestOpenSpace(4, 5, widgets);
          if (position) {
            localStorage.setItem(`widget-layout-${widgetId}`, JSON.stringify({
              x: position.x,
              y: position.y,
              w: 4,
              h: 5
            }));
          }
        }

        widgets.push({
          id: widgetId,
          defaultPosition: position || null,
          defaultSize: { width: 4, height: 5 },
          minWidth: 3,
          minHeight: 3,
          content: <MarbleChartWidget transparentBackground={widgetSettings.marbles?.transparent || false} />,
        });
      }

      if (widgetSettings.groceryList?.enabled) {
        const widgetId = 'grocery-list-widget';
        const savedLayout = localStorage.getItem(`widget-layout-${widgetId}`);
        let position = null;
        
        if (!savedLayout) {
          position = findNearestOpenSpace(4, 5, widgets);
          if (position) {
            localStorage.setItem(`widget-layout-${widgetId}`, JSON.stringify({
              x: position.x,
              y: position.y,
              w: 4,
              h: 5
            }));
          }
        }

        widgets.push({
          id: widgetId,
          defaultPosition: position || null,
          defaultSize: { width: 4, height: 5 },
          minWidth: 3,
          minHeight: 3,
          content: <GroceryListWidget transparentBackground={widgetSettings.groceryList?.transparent || false} />,
        });
      }

      if (widgetSettings.mealPlanner?.enabled) {
        const widgetId = 'meal-planner-widget';
        const savedLayout = localStorage.getItem(`widget-layout-${widgetId}`);
        let position = null;
        
        if (!savedLayout) {
          position = findNearestOpenSpace(6, 5, widgets);
          if (position) {
            localStorage.setItem(`widget-layout-${widgetId}`, JSON.stringify({
              x: position.x,
              y: position.y,
              w: 6,
              h: 5
            }));
          }
        }

        widgets.push({
          id: widgetId,
          defaultPosition: position || null,
          defaultSize: { width: 6, height: 5 },
          minWidth: 4,
          minHeight: 4,
          content: <MealPlannerWidget transparentBackground={widgetSettings.mealPlanner?.transparent || false} />,
        });
      }

      if (widgetSettings.mealSuggestionBox?.enabled) {
        const widgetId = 'meal-suggestion-box-widget';
        const savedLayout = localStorage.getItem(`widget-layout-${widgetId}`);
        let position = null;
        
        if (!savedLayout) {
          position = findNearestOpenSpace(4, 5, widgets);
          if (position) {
            localStorage.setItem(`widget-layout-${widgetId}`, JSON.stringify({
              x: position.x,
              y: position.y,
              w: 4,
              h: 5
            }));
          }
        }

        widgets.push({
          id: widgetId,
          defaultPosition: position || null,
          defaultSize: { width: 4, height: 5 },
          minWidth: 3,
          minHeight: 3,
          content: <MealSuggestionBoxWidget transparentBackground={widgetSettings.mealSuggestionBox?.transparent || false} />,
        });
      }
    } catch (error) {
      console.error('Error building widgets array:', error);
      console.error('Widget settings:', widgetSettings);
      // Return empty array to prevent crash
      return [];
    }

    return widgets;
  };

  const widgets = buildWidgetsArray();

  return (
    <ErrorBoundary>
      <Box sx={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
        {widgets.length > 0 ? (
          <WidgetContainer widgets={widgets} locked={widgetsLocked} />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography variant="h6" sx={{ color: 'var(--text)' }}>
              No widgets enabled
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text)', opacity: 0.7 }}>
              Enable widgets in the Admin Panel to get started
            </Typography>
          </Box>
        )}

        {widgetSettings.widgetGallery?.enabled && (
          <Container className="container" sx={{ mt: widgets.length > 0 ? 4 : 0 }}>
            <WidgetGallery 
              key={widgetGalleryKey} 
              theme={theme}
              transparentBackground={widgetSettings.widgetGallery?.transparent || false}
            />
          </Container>
        )}
      </Box>

      <Dialog 
        open={showAdminPanel} 
        onClose={toggleAdminPanel} 
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            color: 'var(--text)',
            backgroundImage: 'none',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            margin: 0,
            borderRadius: 0,
            boxShadow: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(var(--background-rgb, 0, 0, 0), 0.5)'
          }
        }}
      >
        <DialogContent sx={{ 
          backgroundColor: 'transparent',
          color: 'var(--text)',
          padding: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          '&.MuiDialogContent-root': {
            padding: 0,
          }
        }}>
          <AdminPanel 
            setWidgetSettings={setWidgetSettings} 
            onWidgetUploaded={refreshWidgetGallery}
            onSettingsSaved={refreshApiKeys}
          />
        </DialogContent>
      </Dialog>

      {/* Fixed Bottom Bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: '56px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 8px',
          backgroundColor: 'var(--bottom-bar-bg)',
          borderTop: '1px solid var(--card-border)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--elevation-2)',
          zIndex: 1000,
          animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '@keyframes slideUp': {
            '0%': {
              transform: 'translateY(100%)',
              opacity: 0,
            },
            '100%': {
              transform: 'translateY(0)',
              opacity: 1,
            },
          },
        }}
      >
        {/* Centered Button Group */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, // 8px gap between buttons
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Theme Toggle Button */}
          <Tooltip title="Toggle theme" arrow>
            <IconButton
              onClick={toggleTheme}
              aria-label="Toggle theme"
              sx={{
                width: 40,
                height: 40,
                borderRadius: '20px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              {theme === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          </Tooltip>

          {/* Lock/Unlock Button */}
          <Tooltip title={widgetsLocked ? "Unlock widgets" : "Lock widgets"} arrow>
            <IconButton
              onClick={toggleWidgetsLock}
              aria-label={widgetsLocked ? "Unlock widgets" : "Lock widgets"}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '20px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              {widgetsLocked ? <Lock /> : <LockOpen />}
            </IconButton>
          </Tooltip>

          {/* Logo Button - Center Focal Point */}
          <Tooltip title="MindPalace Home" arrow>
            <IconButton
              onClick={() => {
                // Could open Widget Gallery or scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="MindPalace Home"
              sx={{
                width: 48,
                height: 48,
                borderRadius: '24px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: 'var(--primary)',
                backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
                boxShadow: 'var(--elevation-1)',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.16)',
                  transform: 'scale(1.08)',
                  boxShadow: 'var(--elevation-2)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <img 
                src={`/${apiKeys.LOGO_FILENAME || 'MindPalaceMobileLogo.png'}`}
                alt="MindPalace Logo" 
                style={{ 
                  height: '28px',
                  width: 'auto',
                  objectFit: 'contain'
                }} 
                onError={(e) => {
                  if (e.target.src !== `/${apiKeys.LOGO_FILENAME || 'MindPalaceMobileLogo.png'}`) {
                    e.target.src = '/MindPalaceMobileLogo.png';
                  }
                }}
              />
            </IconButton>
          </Tooltip>

          {/* Admin Panel Button */}
          <Tooltip title="Admin Panel" arrow>
            <IconButton
              onClick={toggleAdminPanel}
              aria-label="Toggle Admin Panel"
              sx={{
                width: 40,
                height: 40,
                borderRadius: '20px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: showAdminPanel ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: showAdminPanel ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
                '&:hover': {
                  backgroundColor: showAdminPanel 
                    ? 'rgba(var(--primary-rgb), 0.16)' 
                    : 'rgba(var(--primary-rgb), 0.08)',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* Refresh Button */}
          <Tooltip title="Refresh page" arrow>
            <IconButton
              onClick={handlePageRefresh}
              aria-label="Refresh Page"
              sx={{
                width: 40,
                height: 40,
                borderRadius: '20px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default App;
