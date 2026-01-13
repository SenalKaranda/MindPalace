import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Chip,
  Avatar,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Backdrop,
  RadioGroup,
  Radio,
  Slider,
  Tooltip,
  ThemeProvider,
  createTheme
} from '@mui/material';
import {
  Delete,
  Edit,
  Save,
  Cancel,
  Add,
  Upload,
  CloudDownload,
  Refresh,
  Warning,
  RestartAlt,
  Timer,
  ViewCompact,
  ViewModule,
  ViewQuilt,
  Remove,
  Close
} from '@mui/icons-material';
import { ChromePicker } from 'react-color';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import { 
  defaultThemeSettings, 
  loadThemeSettings, 
  saveThemeSettings, 
  applyThemeSettings,
  themePresets,
  exportThemeSettings,
  importThemeSettings
} from '../utils/theme.js';

const AdminPanel = ({ setWidgetSettings, onWidgetUploaded, onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    WEATHER_API_KEY: '',
    PROXY_WHITELIST: '',
    TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    LOGO_FILENAME: 'MindPalaceMobileLogo.png'
  });
  const [widgetSettings, setLocalWidgetSettings] = useState({
    chores: { enabled: false, transparent: false, refreshInterval: 0 },
    calendar: { enabled: false, transparent: false, refreshInterval: 0 },
    photos: { enabled: false, transparent: false, refreshInterval: 0 },
    weather: { enabled: false, transparent: false, refreshInterval: 0, layoutMode: 'medium' },
    todos: { enabled: false, transparent: false, refreshInterval: 0 },
    notes: { enabled: false, transparent: false, refreshInterval: 0 },
    alarms: { enabled: false, transparent: false, refreshInterval: 0 },
    houseRules: { enabled: false, transparent: false, refreshInterval: 0 },
    marbles: { enabled: false, transparent: false, refreshInterval: 0 },
    groceryList: { enabled: false, transparent: false, refreshInterval: 0 },
    mealPlanner: { enabled: false, transparent: false, refreshInterval: 0 },
    mealSuggestionBox: { enabled: false, transparent: false, refreshInterval: 0 },
    widgetGallery: { enabled: true, transparent: false, refreshInterval: 0 },
    // Accent colors (shared) - only these are customizable
    primary: '#9E7FFF',
    secondary: '#38bdf8',
    accent: '#f472b6'
  });
  const [users, setUsers] = useState([]);
  const [chores, setChores] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPrize, setEditingPrize] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', profile_picture: '' });
  const [newPrize, setNewPrize] = useState({ name: '', clam_cost: 0, emoji: '' });
  const [prizeMinimumShells, setPrizeMinimumShells] = useState(0);
  const [bonusChoreClamValue, setBonusChoreClamValue] = useState(1);
  const [uploadedWidgets, setUploadedWidgets] = useState([]);
  const [githubWidgets, setGithubWidgets] = useState([]);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState({});
  const [deleteUserDialog, setDeleteUserDialog] = useState({ open: false, user: null });
  const [choreModal, setChoreModal] = useState({ open: false, user: null, userChores: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ show: false, type: '', text: '' });
  
  // Calendar management state
  const [calendarSources, setCalendarSources] = useState([]);
  const [defaultCalendarId, setDefaultCalendarId] = useState(null);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    color: 'var(--primary)'
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savingCalendar, setSavingCalendar] = useState(false);
  
  // PIN Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('adminAuthenticated') === 'true';
  });
  const [showPinDialog, setShowPinDialog] = useState(!isAuthenticated);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  
  // House Rules management state
  const [houseRules, setHouseRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ rule_text: '' });
  const [savingRule, setSavingRule] = useState(false);
  
  // Marble management state
  const [marbles, setMarbles] = useState([]);
  const [marbleSettings, setMarbleSettings] = useState({ daily_increment: 3 });
  const [selectedMarbleUser, setSelectedMarbleUser] = useState(null);
  const [marbleHistory, setMarbleHistory] = useState([]);
  const [removeMarbleDialog, setRemoveMarbleDialog] = useState({ open: false, user: null });
  const [removeMarbleForm, setRemoveMarbleForm] = useState({ amount: '', reason: '' });
  const [overrideMarbleDialog, setOverrideMarbleDialog] = useState({ open: false, user: null });
  const [overrideMarbleForm, setOverrideMarbleForm] = useState({ count: '', reason: '' });
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showMarbleHistoryDialog, setShowMarbleHistoryDialog] = useState(false);
  
  // Photo management state
  const [photoSources, setPhotoSources] = useState([]);
  const [showPhotoSourceDialog, setShowPhotoSourceDialog] = useState(false);
  const [editingPhotoSource, setEditingPhotoSource] = useState(null);
  const [photoSourceForm, setPhotoSourceForm] = useState({
    name: '',
    type: 'Immich',
    url: '',
    api_key: '',
    album_id: '',
    refresh_token: ''
  });
  const [testingPhotoConnection, setTestingPhotoConnection] = useState(false);
  const [photoTestResult, setPhotoTestResult] = useState(null);
  const [savingPhotoSource, setSavingPhotoSource] = useState(false);
  const [photoWidgetSettings, setPhotoWidgetSettings] = useState({
    maxPhotosPerView: 3,
    transitionType: 'none',
    slideshowInterval: 5000,
    showPhotoCount: true
  });
  
  // Theme settings state
  const [themeSettings, setThemeSettings] = useState(() => loadThemeSettings());
  const [themeSubTab, setThemeSubTab] = useState(0); // Sub-tabs for theming sections
  const [calendarSettings, setCalendarSettings] = useState({
    eventBackgroundColor: 'var(--primary)',
    eventTextColor: 'var(--text)',
    textSize: 12,
    bulletSize: 10
  });
  // Initialize previewTheme to match current theme
  const [previewTheme, setPreviewTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });
  
  // Track current theme for MUI theme updates
  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });
  
  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setCurrentTheme(newTheme);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  // Listen for theme updates to ensure MUI theme reads fresh CSS variables
  const [themeUpdateCounter, setThemeUpdateCounter] = React.useState(0);
  React.useEffect(() => {
    const handleThemeUpdate = () => {
      console.log('[AdminPanel] Theme CSS variables updated, incrementing counter to force MUI theme recalculation');
      setThemeUpdateCounter(prev => prev + 1);
    };
    window.addEventListener('themeUpdated', handleThemeUpdate);
    return () => window.removeEventListener('themeUpdated', handleThemeUpdate);
  }, []);
  
  // Create MUI theme that reads CSS variables fresh each time
  const muiTheme = React.useMemo(() => {
    // Read CSS variables fresh each time
    const isDark = currentTheme === 'dark';
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
    const background = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    const cardBg = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim();
    const text = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
    const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: primary || '#9E7FFF',
        },
        secondary: {
          main: secondary || '#38bdf8',
        },
        background: {
          default: background || (isDark ? '#0f0f0f' : '#fafafa'),
          paper: cardBg || (isDark ? '#3a3a3a' : '#ffffff'),
        },
        text: {
          primary: text || (isDark ? '#ffffff' : '#000000'),
          secondary: textSecondary || (isDark ? '#e5e5e5' : '#525252'),
        },
        error: {
          main: getComputedStyle(document.documentElement).getPropertyValue('--error').trim() || '#ef4444',
        },
        warning: {
          main: getComputedStyle(document.documentElement).getPropertyValue('--warning').trim() || '#f59e0b',
        },
        success: {
          main: getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#10b981',
        },
      },
      typography: {
        fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim() || 'Inter, sans-serif',
        fontSize: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--base-font-size').trim()) || 16,
        fontWeightRegular: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-weight').trim()) || 400,
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              border: 'var(--border-width, 1px) var(--border-style, solid) var(--card-border)',
              '& .MuiTypography-root': {
                color: 'var(--text)',
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              '& .MuiTypography-root': {
                color: 'var(--text)',
              },
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiInputBase-root': {
                color: 'var(--text)',
                backgroundColor: 'transparent',
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-secondary)',
                '&.Mui-focused': {
                  color: 'var(--primary)',
                },
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'var(--border)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--primary)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--primary)',
                },
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              '& .MuiSvgIcon-root': {
                color: 'inherit',
              },
            },
            contained: {
              backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--elevation-1)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                boxShadow: 'var(--elevation-2)',
              },
            },
            outlined: {
              backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--card-border)',
              boxShadow: 'var(--elevation-1)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                boxShadow: 'var(--elevation-2)',
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: 'var(--text-secondary)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                color: 'var(--primary)',
              },
              '&.MuiIconButton-colorPrimary': {
                color: 'var(--primary)',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
                  color: 'var(--primary)',
                },
              },
              '&.MuiIconButton-colorError': {
                color: 'var(--error)',
                '&:hover': {
                  backgroundColor: 'rgba(var(--error-rgb), 0.12)',
                  color: 'var(--error)',
                },
              },
              '&.MuiIconButton-colorSecondary': {
                color: 'var(--secondary)',
                '&:hover': {
                  backgroundColor: 'rgba(var(--secondary-rgb), 0.12)',
                  color: 'var(--secondary)',
                },
              },
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              color: 'var(--text-secondary)',
              '&.Mui-selected': {
                color: 'var(--primary)',
              },
            },
          },
        },
        MuiTable: {
          styleOverrides: {
            root: {
              '& .MuiTableCell-root': {
                borderColor: 'var(--border)',
                color: 'var(--text)',
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              backgroundImage: 'none',
            },
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: {
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
            },
          },
        },
        MuiDialogTitle: {
          styleOverrides: {
            root: {
              color: 'var(--text)',
            },
          },
        },
        MuiDialogActions: {
          styleOverrides: {
            root: {
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
            },
          },
        },
        MuiBackdrop: {
          styleOverrides: {
            root: {
              backgroundColor: 'rgba(var(--background-rgb, 0, 0, 0), 0.5)',
            },
          },
        },
        MuiTypography: {
          styleOverrides: {
            root: {
              color: 'var(--text)',
            },
          },
        },
        MuiToggleButtonGroup: {
          styleOverrides: {
            root: {
              borderColor: 'var(--border)',
              '& .MuiToggleButton-root': {
                borderColor: 'var(--border)',
                '&:not(:first-of-type)': {
                  borderLeftColor: 'var(--border)',
                },
              },
            },
          },
        },
        MuiToggleButton: {
          styleOverrides: {
            root: {
              color: 'var(--text-secondary)',
              borderColor: 'var(--border)',
              backgroundColor: 'transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                color: 'var(--primary)',
              },
              '&.Mui-selected': {
                color: 'var(--primary)',
                backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.16)',
                  color: 'var(--primary)',
                },
              },
            },
          },
        },
        MuiSelect: {
          styleOverrides: {
            root: {
              color: 'var(--text)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--border)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--primary)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--primary)',
              },
            },
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              color: 'var(--text)',
              backgroundColor: 'var(--card-bg)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.16)',
                },
              },
            },
          },
        },
        MuiInputLabel: {
          styleOverrides: {
            root: {
              color: 'var(--text-secondary)',
              '&.Mui-focused': {
                color: 'var(--primary)',
              },
            },
          },
        },
        MuiFormLabel: {
          styleOverrides: {
            root: {
              color: 'var(--text)',
              '&.Mui-focused': {
                color: 'var(--primary)',
              },
            },
          },
        },
      },
    });
  }, [themeSettings, currentTheme, themeUpdateCounter]); // Recreate when theme settings, theme mode, or CSS variables change

  // Refresh interval options in milliseconds
  const refreshIntervalOptions = [
    { label: 'Disabled', value: 0 },
    { label: '5 minutes', value: 5 * 60 * 1000 },
    { label: '15 minutes', value: 15 * 60 * 1000 },
    { label: '30 minutes', value: 30 * 60 * 1000 },
    { label: '1 hour', value: 60 * 60 * 1000 },
    { label: '2 hours', value: 2 * 60 * 60 * 1000 },
    { label: '6 hours', value: 6 * 60 * 60 * 1000 },
    { label: '12 hours', value: 12 * 60 * 60 * 1000 },
    { label: '24 hours', value: 24 * 60 * 60 * 1000 }
  ];

  useEffect(() => {
    const savedSettings = localStorage.getItem('widgetSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Ensure refresh intervals and layout mode are included, default to 'medium' if 'auto' or not set
      const settingsWithDefaults = {
        chores: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.chores },
        calendar: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.calendar },
        photos: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.photos },
        weather: { 
          enabled: false, 
          transparent: false, 
          refreshInterval: 0, 
          layoutMode: (parsed.weather?.layoutMode === 'auto' || !parsed.weather?.layoutMode) ? 'medium' : parsed.weather.layoutMode,
          ...parsed.weather 
        },
        todos: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.todos },
        notes: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.notes },
        alarms: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.alarms },
        houseRules: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.houseRules },
        marbles: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.marbles },
        groceryList: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.groceryList },
        mealPlanner: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.mealPlanner },
        mealSuggestionBox: { enabled: false, transparent: false, refreshInterval: 0, ...parsed.mealSuggestionBox },
        widgetGallery: { enabled: true, transparent: false, refreshInterval: 0, ...parsed.widgetGallery },
        primary: parsed.primary || '#9E7FFF',
        secondary: parsed.secondary || '#38bdf8',
        accent: parsed.accent || '#f472b6'
      };
      setLocalWidgetSettings(settingsWithDefaults);
    }
    fetchSettings();
    fetchUsers();
    fetchChores();
    fetchPrizes();
    fetchPrizeMinimumShells();
    fetchBonusChoreClamValue();
    fetchUploadedWidgets();
    fetchCalendarSources();
    fetchDefaultCalendar();
    fetchPhotoSources();
    fetchPhotoWidgetSettings();
  }, []);

  // Fetch photo sources
  const fetchPhotoSources = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/photo-sources`);
      setPhotoSources(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching photo sources:', error);
      setPhotoSources([]);
    }
  };

  // Fetch photo widget settings
  const fetchPhotoWidgetSettings = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings`);
      const settings = response.data;
      setPhotoWidgetSettings({
        maxPhotosPerView: parseInt(settings.PHOTO_WIDGET_MAX_PHOTOS_PER_VIEW || '3'),
        transitionType: settings.PHOTO_WIDGET_TRANSITION_TYPE || 'none',
        slideshowInterval: parseInt(settings.PHOTO_WIDGET_SLIDESHOW_INTERVAL || '5000'),
        showPhotoCount: settings.PHOTO_WIDGET_SHOW_PHOTO_COUNT !== 'false' // Default to true
      });
    } catch (error) {
      console.error('Error fetching photo widget settings:', error);
    }
  };

  // Save photo widget setting
  const savePhotoWidgetSetting = async (key, value) => {
    try {
      await axios.post(`${getApiUrl()}/api/settings`, {
        key,
        value: value.toString()
      });
      await fetchPhotoWidgetSettings();
    } catch (error) {
      console.error('Error saving photo widget setting:', error);
      alert('Failed to save setting. Please try again.');
    }
  };

  // PIN Authentication functions
  const verifyPin = async (pin) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/admin/verify-pin`, { pin });
      if (response.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminPin', pin); // Store PIN for API requests
        setShowPinDialog(false);
        setPinInput('');
        setPinError('');
        return true;
      }
    } catch (error) {
      setPinError('Invalid PIN. Please try again.');
      return false;
    }
    return false;
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    await verifyPin(pinInput);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setShowPinDialog(true);
    setPinInput('');
  };

  const requireAuth = (callback) => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    return callback();
  };

  const fetchSettings = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/settings`);
      const fetchedSettings = response.data;
      // Set default timezone if not present
      if (!fetchedSettings.TIMEZONE) {
        fetchedSettings.TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
      }
      // Set default logo filename if not present
      if (!fetchedSettings.LOGO_FILENAME) {
        fetchedSettings.LOGO_FILENAME = 'MindPalaceMobileLogo.png';
      }
      // Set default orientation if not present
      if (!fetchedSettings.ORIENTATION) {
        fetchedSettings.ORIENTATION = 'portrait';
      }
      setSettings(fetchedSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/users`);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchChores = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/chores`);
      setChores(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching chores:', error);
      setChores([]);
    }
  };

  const fetchPrizes = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/prizes`);
      setPrizes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching prizes:', error);
      setPrizes([]);
    }
  };

  const fetchCalendarSources = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/calendar-sources`);
      setCalendarSources(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching calendar sources:', error);
      setCalendarSources([]);
    }
  };

  const fetchDefaultCalendar = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings/DEFAULT_CALENDAR_ID`);
      if (response.data && response.data.value) {
        setDefaultCalendarId(parseInt(response.data.value));
      } else {
        setDefaultCalendarId(null);
      }
    } catch (error) {
      // Setting might not exist yet, that's okay
      setDefaultCalendarId(null);
    }
  };

  const handleAddCalendar = () => {
    setEditingCalendar(null);
    setCalendarForm({
      name: '',
      url: '',
      username: '',
      password: '',
      color: 'var(--primary)'
    });
    setTestResult(null);
    setShowCalendarDialog(true);
  };

  const handleEditCalendar = (calendar) => {
    setEditingCalendar(calendar);
    setCalendarForm({
      name: calendar.name,
      url: calendar.url,
      username: calendar.username || '',
      password: '',
      color: calendar.color
    });
    setTestResult(null);
    setShowCalendarDialog(true);
  };

  const handleToggleCalendar = async (calendarId, enabled) => {
    try {
      // Don't allow disabling the default calendar
      if (calendarId === defaultCalendarId && enabled) {
        setSaveMessage({ show: true, type: 'error', text: 'Cannot disable the default calendar. Set another calendar as default first.' });
        setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
        return;
      }
      await axios.patch(`${getApiUrl()}/api/calendar-sources/${calendarId}`, {
        enabled: !enabled
      });
      await fetchCalendarSources();
    } catch (error) {
      console.error('Error toggling calendar:', error);
    }
  };

  const handleDeleteCalendar = async (calendarId) => {
    // Don't allow deleting the default calendar
    if (calendarId === defaultCalendarId) {
      setSaveMessage({ show: true, type: 'error', text: 'Cannot delete the default calendar. Set another calendar as default first.' });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
      return;
    }
    if (window.confirm('Are you sure you want to delete this calendar?')) {
      try {
        await axios.delete(`${getApiUrl()}/api/calendar-sources/${calendarId}`);
        await fetchCalendarSources();
      } catch (error) {
        console.error('Error deleting calendar:', error);
        alert('Failed to delete calendar. Please try again.');
      }
    }
  };

  const handleSetDefaultCalendar = async (calendarId) => {
    try {
      await axios.put(`${getApiUrl()}/api/settings/DEFAULT_CALENDAR_ID`, {
        value: calendarId.toString()
      });
      setDefaultCalendarId(calendarId);
      setSaveMessage({ show: true, type: 'success', text: 'Default calendar set successfully!' });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error setting default calendar:', error);
      setSaveMessage({ show: true, type: 'error', text: 'Failed to set default calendar.' });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
    }
  };

  const handleTestConnection = async () => {
    if (editingCalendar) {
      setTestingConnection(true);
      try {
        const response = await axios.post(`${getApiUrl()}/api/calendar-sources/${editingCalendar.id}/test`);
        setTestResult({ success: true, message: response.data.message });
      } catch (error) {
        setTestResult({ success: false, message: error.response?.data?.error || 'Connection failed' });
      } finally {
        setTestingConnection(false);
      }
    } else {
      setTestResult({ success: false, message: 'Please save the calendar before testing' });
    }
  };

  const handleSaveCalendar = async () => {
    setSavingCalendar(true);
    try {
      if (editingCalendar) {
        await axios.patch(`${getApiUrl()}/api/calendar-sources/${editingCalendar.id}`, calendarForm);
      } else {
        await axios.post(`${getApiUrl()}/api/calendar-sources`, calendarForm);
      }
      await fetchCalendarSources();
      setShowCalendarDialog(false);
      setSaveMessage({ show: true, type: 'success', text: 'Calendar saved successfully!' });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving calendar:', error);
      setSaveMessage({ show: true, type: 'error', text: error.response?.data?.error || 'Failed to save calendar.' });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 5000);
    } finally {
      setSavingCalendar(false);
    }
  };

  const fetchUploadedWidgets = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/widgets`);
      setUploadedWidgets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching uploaded widgets:', error);
      setUploadedWidgets([]);
    }
  };

  const fetchGithubWidgets = async () => {
    setLoadingGithub(true);
    try {
      const response = await axios.get(`${getApiUrl()}/api/widgets/github`);
      setGithubWidgets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching GitHub widgets:', error);
      setGithubWidgets([]);
    } finally {
      setLoadingGithub(false);
    }
  };

  const saveSetting = async (key, value, showMessage = true) => {
    try {
      await axios.post(`${getApiUrl()}/api/settings`, { key, value });
      setSettings(prev => ({ ...prev, [key]: value }));
      if (showMessage) {
        setSaveMessage({ show: true, type: 'success', text: 'Setting saved successfully!' });
        setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      if (showMessage) {
        setSaveMessage({ show: true, type: 'error', text: 'Failed to save setting. Please try again.' });
        setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
      }
      throw error;
    }
  };

  const saveAllApiSettings = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.all([
        axios.post(`${getApiUrl()}/api/settings`, { key: 'WEATHER_API_KEY', value: settings.WEATHER_API_KEY || '' }),
        axios.post(`${getApiUrl()}/api/settings`, { key: 'PROXY_WHITELIST', value: settings.PROXY_WHITELIST || '' }),
        axios.post(`${getApiUrl()}/api/settings`, { key: 'TIMEZONE', value: settings.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York' })
      ]);
      setSaveMessage({ show: true, type: 'success', text: 'All API settings saved successfully!' });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
      // Notify parent component to refresh API keys
      if (onSettingsSaved) {
        onSettingsSaved();
      }
    } catch (error) {
      console.error('Error saving API settings:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save settings. Please check the server logs.';
      setSaveMessage({ show: true, type: 'error', text: `Error: ${errorMessage}` });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWidgetSettings = () => {
    localStorage.setItem('widgetSettings', JSON.stringify(widgetSettings));
    setWidgetSettings(widgetSettings);
    // Trigger storage event so app.jsx can pick up the changes
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'widgetSettings',
      newValue: JSON.stringify(widgetSettings),
      storageArea: localStorage
    }));
    setSaveMessage({ show: true, type: 'success', text: 'Widget settings saved successfully! Changes will apply immediately.' });
    setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
  };

  const saveInterfaceSettings = () => {
    localStorage.setItem('widgetSettings', JSON.stringify(widgetSettings));
    setWidgetSettings(widgetSettings);
    
    // Trigger storage event so app.jsx can pick up the changes
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'widgetSettings',
      newValue: JSON.stringify(widgetSettings),
      storageArea: localStorage
    }));
    
    // Apply CSS variables immediately
    applyAccentColors();
    
    setSaveMessage({ show: true, type: 'success', text: 'Accent colors saved! Changes will apply immediately.' });
    setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
  };

  const applyAccentColors = () => {
    const root = document.documentElement;
    
    // Apply only accent colors
    root.style.setProperty('--primary', widgetSettings.primary);
    root.style.setProperty('--secondary', widgetSettings.secondary);
    root.style.setProperty('--accent', widgetSettings.accent);
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      primary: '#9E7FFF',
      secondary: '#38bdf8',
      accent: '#f472b6'
    };
    
    setLocalWidgetSettings(prev => ({ ...prev, ...defaultSettings }));
    setSaveMessage({ show: true, type: 'info', text: 'Reset to default colors. Click Save to apply.' });
    setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
  };

  const handleWidgetToggle = (widget, field) => {
    setLocalWidgetSettings(prev => ({
      ...prev,
      [widget]: {
        ...prev[widget],
        [field]: !prev[widget][field]
      }
    }));
  };

  const handleRefreshIntervalChange = (widget, interval) => {
    setLocalWidgetSettings(prev => ({
      ...prev,
      [widget]: {
        ...prev[widget],
        refreshInterval: interval
      }
    }));
  };

  const handleWeatherLayoutModeChange = (mode) => {
    setLocalWidgetSettings(prev => ({
      ...prev,
      weather: {
        ...prev.weather,
        layoutMode: mode
      }
    }));
  };

  const handleSettingChange = (setting, value) => {
    setLocalWidgetSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleColorChange = (colorKey, color) => {
    setLocalWidgetSettings(prev => ({
      ...prev,
      [colorKey]: color.hex
    }));
  };

  // Theme settings handlers
  const handleThemeSettingChange = (path, value) => {
    setThemeSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Apply changes immediately for preview (use current theme, not previewTheme)
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      applyThemeSettings(newSettings, currentTheme, true);
      
      return newSettings;
    });
  };

  const handleThemeColorChange = (theme, colorKey, color) => {
    handleThemeSettingChange(`colors.${theme}.${colorKey}`, color.hex || color);
  };

  const saveThemeSettingsHandler = () => {
    saveThemeSettings(themeSettings);
    // Get current theme from document and apply (not preview)
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    console.log('[AdminPanel] Saving theme settings and applying for', currentTheme);
    applyThemeSettings(themeSettings, currentTheme, false);
    
    // Force a custom event to notify other components
    window.dispatchEvent(new CustomEvent('themeUpdated', { detail: { theme: currentTheme, settings: themeSettings } }));
    
    setSaveMessage({ show: true, type: 'success', text: 'Theme settings saved! Changes applied immediately.' });
    setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
  };

  const resetThemeSection = (section) => {
    setThemeSettings(prev => ({
      ...prev,
      [section]: { ...defaultThemeSettings[section] }
    }));
    setSaveMessage({ show: true, type: 'info', text: `${section} reset to defaults. Click Save to apply.` });
    setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
  };

  const applyPreset = (presetName) => {
    if (presetName === 'custom') {
      // Keep current settings
      return;
    }
    const preset = themePresets[presetName];
    if (preset) {
      setThemeSettings(preset.settings);
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      applyThemeSettings(preset.settings, currentTheme, true);
      setSaveMessage({ show: true, type: 'success', text: `Applied ${preset.name} theme! Click Save to persist.` });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
    }
  };

  const handleExportTheme = () => {
    exportThemeSettings(themeSettings);
    setSaveMessage({ show: true, type: 'success', text: 'Theme exported successfully!' });
    setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
  };

  const handleImportTheme = (event) => {
    const file = event.target.files[0];
    if (file) {
      importThemeSettings(file)
        .then(settings => {
          setThemeSettings(settings);
          const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
          applyThemeSettings(settings, currentTheme, true);
          setSaveMessage({ show: true, type: 'success', text: 'Theme imported successfully! Click Save to persist.' });
          setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
        })
        .catch(error => {
          setSaveMessage({ show: true, type: 'error', text: error.message });
          setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
        });
    }
    // Reset input
    event.target.value = '';
  };

  const saveUser = async () => {
    try {
      setIsLoading(true);
      if (editingUser) {
        await axios.patch(`${getApiUrl()}/api/users/${editingUser.id}`, editingUser);
        setSaveMessage({ show: true, type: 'success', text: 'User updated successfully!' });
      } else {
        if (!newUser.username || !newUser.email) {
          setSaveMessage({ show: true, type: 'error', text: 'Username and email are required.' });
          setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
          return;
        }
        await axios.post(`${getApiUrl()}/api/users`, newUser);
        setNewUser({ username: '', email: '', profile_picture: '' });
        setSaveMessage({ show: true, type: 'success', text: 'User added successfully!' });
      }
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save user. Please check the server logs.';
      setSaveMessage({ show: true, type: 'error', text: `Error: ${errorMessage}` });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setIsLoading(true);
      const userChores = chores.filter(chore => chore.user_id === userId);
      for (const chore of userChores) {
        try {
          await axios.delete(`${getApiUrl()}/api/chores/${chore.id}`);
        } catch (choreError) {
          console.error(`Error deleting chore ${chore.id}:`, choreError);
          // Continue with user deletion even if chore deletion fails
        }
      }
      
      await axios.delete(`${getApiUrl()}/api/users/${userId}`);
      
      fetchUsers();
      fetchChores();
      setDeleteUserDialog({ open: false, user: null });
      setSaveMessage({ show: true, type: 'success', text: 'User deleted successfully!' });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete user. Please check the server logs.';
      setSaveMessage({ show: true, type: 'error', text: `Error: ${errorMessage}` });
      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 5000);
      setDeleteUserDialog({ open: false, user: null });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserDelete = (user) => {
    setDeleteUserDialog({ open: true, user });
  };

  const updateUserClams = async (userId, newTotal) => {
    try {
      setIsLoading(true);
      await axios.patch(`${getApiUrl()}/api/users/${userId}/clams`, {
        clam_total: newTotal
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user clams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrize = async () => {
    try {
      setIsLoading(true);
      if (editingPrize) {
        // Ensure emoji is always included, even if empty
        const prizeData = {
          name: editingPrize.name,
          clam_cost: editingPrize.clam_cost,
          emoji: editingPrize.emoji || ''
        };
        await axios.patch(`${getApiUrl()}/api/prizes/${editingPrize.id}`, prizeData);
      } else {
        // Ensure emoji is always included, even if empty
        const prizeData = {
          name: newPrize.name,
          clam_cost: newPrize.clam_cost,
          emoji: newPrize.emoji || ''
        };
        await axios.post(`${getApiUrl()}/api/prizes`, prizeData);
        setNewPrize({ name: '', clam_cost: 0, emoji: '' });
      }
      setEditingPrize(null);
      fetchPrizes();
    } catch (error) {
      console.error('Error saving prize:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deletePrize = async (prizeId) => {
    if (window.confirm('Are you sure you want to delete this prize?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${getApiUrl()}/api/prizes/${prizeId}`);
        fetchPrizes();
      } catch (error) {
        console.error('Error deleting prize:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fetchPrizeMinimumShells = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings/PRIZE_MINIMUM_SHELLS`);
      setPrizeMinimumShells(response.data.value || 0);
    } catch (error) {
      console.error('Error fetching minimum shells setting:', error);
      setPrizeMinimumShells(0);
    }
  };

  const savePrizeMinimumShells = async () => {
    if (!isAuthenticated) {
      alert('Admin PIN required to save settings');
      return;
    }
    try {
      setIsLoading(true);
      await axios.put(`${getApiUrl()}/api/settings/PRIZE_MINIMUM_SHELLS`, 
        { value: prizeMinimumShells },
        { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
      );
      alert('Minimum shells setting saved successfully');
    } catch (error) {
      console.error('Error saving minimum shells setting:', error);
      alert('Failed to save minimum shells setting');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBonusChoreClamValue = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings/BONUS_CHORE_CLAM_VALUE`);
      setBonusChoreClamValue(response.data.value ? parseInt(response.data.value) : 1);
    } catch (error) {
      console.error('Error fetching bonus chore clam value setting:', error);
      setBonusChoreClamValue(1);
    }
  };

  const saveBonusChoreClamValue = async () => {
    if (!isAuthenticated) {
      alert('Admin PIN required to save settings');
      return;
    }
    try {
      setIsLoading(true);
      await axios.put(`${getApiUrl()}/api/settings/BONUS_CHORE_CLAM_VALUE`, 
        { value: bonusChoreClamValue },
        { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
      );
      alert('Bonus chore clam value saved successfully');
    } catch (error) {
      console.error('Error saving bonus chore clam value setting:', error);
      alert('Failed to save bonus chore clam value setting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWidgetUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      await axios.post(`${getApiUrl()}/api/widgets/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchUploadedWidgets();
      if (onWidgetUploaded) onWidgetUploaded();
    } catch (error) {
      console.error('Error uploading widget:', error);
      alert('Failed to upload widget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWidget = async (filename) => {
    if (window.confirm('Are you sure you want to delete this widget?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${getApiUrl()}/api/widgets/${filename}`);
        fetchUploadedWidgets();
        if (onWidgetUploaded) onWidgetUploaded();
      } catch (error) {
        console.error('Error deleting widget:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const installGithubWidget = async (widget) => {
    try {
      setIsLoading(true);
      await axios.post(`${getApiUrl()}/api/widgets/github/install`, {
        download_url: widget.download_url,
        filename: widget.filename,
        name: widget.name
      });
      fetchUploadedWidgets();
      if (onWidgetUploaded) onWidgetUploaded();
      alert(`Widget "${widget.name}" installed successfully!`);
    } catch (error) {
      console.error('Error installing GitHub widget:', error);
      alert('Failed to install widget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openChoreModal = (user) => {
    const userChores = chores.filter(chore => chore.user_id === user.id);
    setChoreModal({ open: true, user, userChores });
  };

  const closeChoreModal = () => {
    setChoreModal({ open: false, user: null, userChores: [] });
  };

  const deleteChore = async (choreId) => {
    if (window.confirm('Are you sure you want to delete this chore?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${getApiUrl()}/api/chores/${choreId}`);
        fetchChores();
        if (choreModal.user) {
          const updatedUserChores = chores.filter(chore => chore.user_id === choreModal.user.id && chore.id !== choreId);
          setChoreModal(prev => ({ ...prev, userChores: updatedUserChores }));
        }
      } catch (error) {
        console.error('Error deleting chore:', error);
        alert('Failed to delete chore. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const deleteAllUserChores = async (userId) => {
    const userChores = chores.filter(chore => chore.user_id === userId);
    const choreCount = userChores.length;
    
    if (choreCount === 0) {
      alert('This user has no chores to delete.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete all ${choreCount} chore${choreCount !== 1 ? 's' : ''} for this user? This action cannot be undone.`)) {
      try {
        setIsLoading(true);
        // Delete all chores for this user
        const deletePromises = userChores.map(chore => 
          axios.delete(`${getApiUrl()}/api/chores/${chore.id}`)
        );
        await Promise.all(deletePromises);
        fetchChores();
        if (choreModal.user && choreModal.user.id === userId) {
          setChoreModal(prev => ({ ...prev, userChores: [] }));
        }
        alert(`Successfully deleted ${choreCount} chore${choreCount !== 1 ? 's' : ''}.`);
      } catch (error) {
        console.error('Error deleting chores:', error);
        alert('Failed to delete some chores. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleProfilePictureUpload = async (userId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${getApiUrl()}/api/users/${userId}/upload-picture`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      fetchUsers();
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserAvatar = (user) => {
    let imageUrl = null;
    if (user.profile_picture) {
      if (user.profile_picture.startsWith('data:')) {
        imageUrl = user.profile_picture;
      } else {
        imageUrl = `${getApiUrl()}/Uploads/users/${user.profile_picture}`;
      }
    }

    return imageUrl ? (
      <img
        src={imageUrl}
        alt={user.username}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid var(--accent)'
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    ) : (
      <Avatar sx={{ width: 40, height: 40, bgcolor: 'var(--accent)' }}>
        {user.username.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  const getUserChoreCount = (userId) => {
    return chores.filter(chore => chore.user_id === userId).length;
  };

  const renderColorPicker = (key, label) => (
    <Box key={key} sx={{ mb: 3 }}>
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            backgroundColor: widgetSettings[key],
            border: '3px solid var(--card-border)',
            borderRadius: 'var(--border-radius-medium)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }
          }}
          onClick={() => setShowColorPicker(prev => ({ ...prev, [key]: !prev[key] }))}
        />
        <TextField
          size="medium"
          value={widgetSettings[key]}
          onChange={(e) => handleSettingChange(key, e.target.value)}
          sx={{ flex: 1 }}
          placeholder="#000000"
        />
      </Box>
      {showColorPicker[key] && (
        <Box sx={{ position: 'relative', mt: 2 }}>
          <Box
            sx={{ 
              position: 'fixed', 
              top: 0, 
              right: 0, 
              bottom: 0, 
              left: 0,
              zIndex: 999
            }}
            onClick={() => setShowColorPicker(prev => ({ ...prev, [key]: false }))}
          />
          <Box sx={{ position: 'absolute', zIndex: 1000 }}>
            <ChromePicker
              color={widgetSettings[key]}
              onChange={(color) => handleColorChange(key, color)}
            />
          </Box>
        </Box>
      )}
    </Box>
  );

  // Theme color picker for expanded palette
  const renderThemeColorPicker = (theme, colorKey, label, category = null) => {
    const pickerKey = category ? `${category}.${colorKey}` : `${theme}.${colorKey}`;
    const colorPath = category 
      ? `colors.${category}.${colorKey}`
      : `colors.${theme}.${colorKey}`;
    const currentColor = category
      ? (themeSettings.colors?.[category]?.[colorKey] || defaultThemeSettings.colors.gradients[colorKey])
      : (themeSettings.colors?.[theme]?.[colorKey] || defaultThemeSettings.colors[theme]?.[colorKey]);
    
    return (
      <Box key={pickerKey} sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 50,
              height: 50,
              backgroundColor: currentColor || '#000000',
              border: '2px solid var(--card-border)',
              borderRadius: 'var(--border-radius-small)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }
            }}
            onClick={() => setShowColorPicker(prev => ({ ...prev, [pickerKey]: !prev[pickerKey] }))}
          />
          <TextField
            size="small"
            value={currentColor || ''}
            onChange={(e) => handleThemeSettingChange(colorPath, e.target.value)}
            sx={{ flex: 1 }}
            placeholder="#000000"
          />
        </Box>
        {showColorPicker[pickerKey] && (
          <Box sx={{ position: 'relative', mt: 1 }}>
            <Box
              sx={{ 
                position: 'fixed', 
                top: 0, 
                right: 0, 
                bottom: 0, 
                left: 0,
                zIndex: 999
              }}
              onClick={() => setShowColorPicker(prev => ({ ...prev, [pickerKey]: false }))}
            />
            <Box sx={{ position: 'absolute', zIndex: 1000 }}>
              <ChromePicker
                color={currentColor || '#000000'}
                onChange={(color) => {
                  if (category) {
                    handleThemeSettingChange(colorPath, color.hex);
                  } else {
                    handleThemeColorChange(theme, colorKey, color);
                  }
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // Spacing slider helper
  const renderSpacingSlider = (key, label, min, max) => {
    const value = themeSettings.spacing?.[key] || defaultThemeSettings.spacing[key];
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {label}: {value}px
        </Typography>
        <Slider
          value={value}
          onChange={(e, newValue) => handleThemeSettingChange(`spacing.${key}`, newValue)}
          min={min}
          max={max}
          step={2}
          marks={[
            { value: min, label: `${min}px` },
            { value: max, label: `${max}px` }
          ]}
        />
      </Box>
    );
  };

  // Border radius slider helper
  const renderBorderRadiusSlider = (key, label, min, max) => {
    const value = themeSettings.borders?.[key] || defaultThemeSettings.borders[key];
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {label}: {value}px
        </Typography>
        <Slider
          value={value}
          onChange={(e, newValue) => handleThemeSettingChange(`borders.${key}`, newValue)}
          min={min}
          max={max}
          step={2}
          marks={[
            { value: min, label: `${min}px` },
            { value: max, label: `${max}px` }
          ]}
        />
      </Box>
    );
  };

  const getRefreshIntervalLabel = (interval) => {
    const option = refreshIntervalOptions.find(opt => opt.value === interval);
    return option ? option.label : 'Disabled';
  };

  const tabs = [
    'APIs',
    'Widgets',
    'Calendars',
    'Photos',
    'Interface',
    'Users',
    'Prizes',
    'House Rules',
    'Marbles',
    'Plugins'
  ];

  // Fetch house rules
  const fetchHouseRules = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/house-rules`);
      setHouseRules(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching house rules:', error);
      setHouseRules([]);
    }
  };

  // Fetch marbles (all users with tracking status)
  const fetchMarbles = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/marbles/all`, {
        headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' }
      });
      setMarbles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching marbles:', error);
      setMarbles([]);
    }
  };

  // Fetch marble settings
  const fetchMarbleSettings = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/marbles/settings`);
      setMarbleSettings(response.data || { daily_increment: 3 });
    } catch (error) {
      console.error('Error fetching marble settings:', error);
    }
  };

  // Fetch marble history
  const fetchMarbleHistory = async (userId) => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/marbles/${userId}/history`, {
        params: { limit: 50 }
      });
      setMarbleHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching marble history:', error);
      setMarbleHistory([]);
    }
  };

  // Load data when tabs are active
  useEffect(() => {
    if (activeTab === 3 && isAuthenticated) { // Photos tab
      fetchPhotoSources();
      fetchPhotoWidgetSettings();
    }
    if (activeTab === 7 && isAuthenticated) { // House Rules tab
      fetchHouseRules();
    }
    if (activeTab === 8 && isAuthenticated) { // Marbles tab
      fetchMarbles();
      fetchMarbleSettings();
    }
  }, [activeTab, isAuthenticated]);

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        p: 3
      }}>
        <Box sx={{ 
          width: 'calc(100vw * 0.75)', 
          maxWidth: 'calc(100vw * 0.75)',
          height: 'calc(100vh * 0.75)',
          maxHeight: 'calc(100vh * 0.75)',
          mx: 'auto', 
          color: 'var(--text)',
          px: 4,
          py: 3,
          overflow: 'auto',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--border-radius-medium)',
                      boxShadow: '0 4px 20px rgba(var(--background-rgb, 0, 0, 0), 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
        {/* Header with gradient border */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '2px solid var(--accent)',
          background: 'linear-gradient(135deg, var(--accent) 0%, transparent 100%)',
          backgroundSize: '100% 3px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold',
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              ⚙️ Admin Panel
            </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isAuthenticated && (
              <Button
                variant="outlined"
                onClick={handleLogout}
                sx={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              >
                Logout
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => {
                window.location.reload();
              }}
              startIcon={<Close />}
              sx={{
                backgroundColor: 'var(--primary)',
                color: 'var(--text)',
                '&:hover': {
                  backgroundColor: 'var(--primary)',
                  opacity: 0.9
                }
              }}
            >
              Exit & Refresh
            </Button>
          </Box>
        </Box>
        </Box>

        {/* PIN Dialog */}
        <Dialog
          open={showPinDialog}
          onClose={() => {}} // Prevent closing without PIN
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Admin PIN Required</DialogTitle>
          <form onSubmit={handlePinSubmit}>
            <DialogContent>
              <TextField
                fullWidth
                label="Enter Admin PIN"
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                error={!!pinError}
                helperText={pinError}
                autoFocus
                sx={{ mt: 1 }}
              />
            </DialogContent>
            <DialogActions>
              <Button
                type="submit"
                variant="contained"
                disabled={!pinInput}
                sx={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--text)',
                  '&:hover': {
                    backgroundColor: 'var(--primary)',
                    opacity: 0.9
                  }
                }}
              >
                Verify
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {!isAuthenticated && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please enter your admin PIN to access the admin panel.
          </Alert>
        )}

      <Tabs value={activeTab} onChange={(e, newValue) => {
        if (!isAuthenticated && (newValue === 3 || newValue === 7 || newValue === 8)) {
          setShowPinDialog(true);
          return;
        }
        setActiveTab(newValue);
      }} sx={{ mb: 3 }}>
        {tabs.map((tab, index) => (
          <Tab key={tab} label={tab} disabled={!isAuthenticated && (index === 3 || index === 7 || index === 8)} />
        ))}
      </Tabs>

      {/* APIs Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>API Configuration</Typography>

            {saveMessage.show && (
              <Alert severity={saveMessage.type} sx={{ mb: 2 }}>
                {saveMessage.text}
              </Alert>
            )}

            <TextField
              fullWidth
              label="OpenWeatherMap API Key"
              type="password"
              value={settings.WEATHER_API_KEY || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, WEATHER_API_KEY: e.target.value }))}
              sx={{ mb: 2 }}
              helperText="Get your free API key from openweathermap.org"
            />

            <TextField
              fullWidth
              label="Proxy Whitelist (comma-separated domains)"
              value={settings.PROXY_WHITELIST || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, PROXY_WHITELIST: e.target.value }))}
              sx={{ mb: 2 }}
              helperText="Domains allowed for proxy requests (e.g., api.example.com, another-api.com)"
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Timezone</InputLabel>
              <Select
                value={settings.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'}
                onChange={(e) => setSettings(prev => ({ ...prev, TIMEZONE: e.target.value }))}
                label="Timezone"
              >
                <MenuItem value="America/New_York">Eastern Time (US & Canada)</MenuItem>
                <MenuItem value="America/Chicago">Central Time (US & Canada)</MenuItem>
                <MenuItem value="America/Denver">Mountain Time (US & Canada)</MenuItem>
                <MenuItem value="America/Los_Angeles">Pacific Time (US & Canada)</MenuItem>
                <MenuItem value="America/Phoenix">Arizona</MenuItem>
                <MenuItem value="America/Anchorage">Alaska</MenuItem>
                <MenuItem value="Pacific/Honolulu">Hawaii</MenuItem>
                <MenuItem value="America/Toronto">Toronto</MenuItem>
                <MenuItem value="America/Vancouver">Vancouver</MenuItem>
                <MenuItem value="Europe/London">London</MenuItem>
                <MenuItem value="Europe/Paris">Paris</MenuItem>
                <MenuItem value="Europe/Berlin">Berlin</MenuItem>
                <MenuItem value="Europe/Rome">Rome</MenuItem>
                <MenuItem value="Europe/Madrid">Madrid</MenuItem>
                <MenuItem value="Europe/Amsterdam">Amsterdam</MenuItem>
                <MenuItem value="Europe/Stockholm">Stockholm</MenuItem>
                <MenuItem value="Europe/Moscow">Moscow</MenuItem>
                <MenuItem value="Asia/Tokyo">Tokyo</MenuItem>
                <MenuItem value="Asia/Shanghai">Shanghai</MenuItem>
                <MenuItem value="Asia/Hong_Kong">Hong Kong</MenuItem>
                <MenuItem value="Asia/Singapore">Singapore</MenuItem>
                <MenuItem value="Asia/Dubai">Dubai</MenuItem>
                <MenuItem value="Asia/Kolkata">Mumbai, Kolkata</MenuItem>
                <MenuItem value="Australia/Sydney">Sydney</MenuItem>
                <MenuItem value="Australia/Melbourne">Melbourne</MenuItem>
                <MenuItem value="Australia/Perth">Perth</MenuItem>
                <MenuItem value="Pacific/Auckland">Auckland</MenuItem>
                <MenuItem value="UTC">UTC</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" sx={{ mb: 2, display: 'block', color: 'var(--text-secondary)' }}>
              All datetime operations in the app will use this timezone.
            </Typography>


            <Button
              variant="contained"
              onClick={saveAllApiSettings}
              disabled={isLoading}
              startIcon={<Save />}
              sx={{ mt: 2 }}
            >
              {isLoading ? 'Saving...' : 'Save API Settings'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Widgets Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Widget Settings</Typography>

            {saveMessage.show && (
              <Alert severity={saveMessage.type} sx={{ mb: 2 }}>
                {saveMessage.text}
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 2 }}>
              Enable widgets to show them on the dashboard. Click to select a widget, then drag to move or resize from corners.
            </Alert>

            {/* Core Widgets */}
            {Object.entries(widgetSettings).filter(([key]) => 
              ['chores', 'calendar', 'photos', 'todos', 'notes', 'alarms', 'houseRules', 'marbles', 'groceryList', 'mealPlanner', 'mealSuggestionBox'].includes(key)
            ).map(([widget, config]) => (
              <Box key={widget} sx={{ mb: 3, p: 2, border: '1px solid var(--card-border)', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, textTransform: 'capitalize', fontWeight: 'bold' }}>
                  {widget === 'groceryList' ? '🛒 Grocery List' : 
                   widget === 'mealPlanner' ? '🍽️ Meal Planner' :
                   widget === 'mealSuggestionBox' ? '💡 Meal Suggestion Box' :
                   widget} Widget
                </Typography>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.enabled}
                          onChange={() => handleWidgetToggle(widget, 'enabled')}
                        />
                      }
                      label="Enabled"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.transparent}
                          onChange={() => handleWidgetToggle(widget, 'transparent')}
                        />
                      }
                      label="Transparent Background"
                      sx={{ ml: 2 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel id={`${widget}-refresh-label`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Timer fontSize="small" />
                          Auto-Refresh Interval
                        </Box>
                      </InputLabel>
                      <Select
                        labelId={`${widget}-refresh-label`}
                        value={config.refreshInterval || 0}
                        onChange={(e) => handleRefreshIntervalChange(widget, e.target.value)}
                        label="Auto-Refresh Interval"
                      >
                        {refreshIntervalOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                {config.refreshInterval > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }} icon={<Timer />}>
                    This widget will automatically refresh every {getRefreshIntervalLabel(config.refreshInterval).toLowerCase()}
                  </Alert>
                )}
              </Box>
            ))}

            {/* Weather Widget with Layout Mode */}
            <Box sx={{ mb: 3, p: 2, border: '2px solid var(--accent)', borderRadius: 1, backgroundColor: 'rgba(158, 127, 255, 0.05)' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                🌤️ Weather Widget
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={widgetSettings.weather?.enabled || false}
                        onChange={() => handleWidgetToggle('weather', 'enabled')}
                      />
                    }
                    label="Enabled"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={widgetSettings.weather?.transparent || false}
                        onChange={() => handleWidgetToggle('weather', 'transparent')}
                      />
                    }
                    label="Transparent Background"
                    sx={{ ml: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="weather-refresh-label">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timer fontSize="small" />
                        Auto-Refresh Interval
                      </Box>
                    </InputLabel>
                    <Select
                      labelId="weather-refresh-label"
                      value={widgetSettings.weather?.refreshInterval || 0}
                      onChange={(e) => handleRefreshIntervalChange('weather', e.target.value)}
                      label="Auto-Refresh Interval"
                    >
                      {refreshIntervalOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {widgetSettings.weather?.refreshInterval > 0 && (
                <Alert severity="info" sx={{ mt: 2 }} icon={<Timer />}>
                  Weather widget will automatically refresh every {getRefreshIntervalLabel(widgetSettings.weather.refreshInterval).toLowerCase()}
                </Alert>
              )}
            </Box>

            {/* Widget Gallery Settings */}
            <Box sx={{ mb: 2, p: 2, border: '2px solid var(--accent)', borderRadius: 1, backgroundColor: 'rgba(244, 114, 182, 0.05)' }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                🎨 Widget Gallery
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The Widget Gallery displays custom uploaded widgets below the main dashboard widgets.
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={widgetSettings.widgetGallery?.enabled || false}
                        onChange={() => handleWidgetToggle('widgetGallery', 'enabled')}
                      />
                    }
                    label="Show Widget Gallery"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={widgetSettings.widgetGallery?.transparent || false}
                        onChange={() => handleWidgetToggle('widgetGallery', 'transparent')}
                      />
                    }
                    label="Transparent Background"
                    sx={{ ml: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="gallery-refresh-label">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timer fontSize="small" />
                        Auto-Refresh Interval
                      </Box>
                    </InputLabel>
                    <Select
                      labelId="gallery-refresh-label"
                      value={widgetSettings.widgetGallery?.refreshInterval || 0}
                      onChange={(e) => handleRefreshIntervalChange('widgetGallery', e.target.value)}
                      label="Auto-Refresh Interval"
                    >
                      {refreshIntervalOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {widgetSettings.widgetGallery?.refreshInterval > 0 && (
                <Alert severity="info" sx={{ mt: 2 }} icon={<Timer />}>
                  Widget Gallery will automatically refresh every {getRefreshIntervalLabel(widgetSettings.widgetGallery.refreshInterval).toLowerCase()}
                </Alert>
              )}
            </Box>
            
            <Button variant="contained" onClick={saveWidgetSettings} sx={{ mt: 2 }} startIcon={<Save />}>
              Save Widget Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Calendars Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>CalDAV Calendar Management</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddCalendar}
              >
                Add Calendar
              </Button>
            </Box>

            {saveMessage.show && (
              <Alert severity={saveMessage.type} sx={{ mb: 2 }}>
                {saveMessage.text}
              </Alert>
            )}

            {calendarSources.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                No calendars configured. Add your first CalDAV calendar to get started.
              </Alert>
            ) : (
              <List>
                {calendarSources.map((calendar) => (
                  <ListItem
                    key={calendar.id}
                    sx={{
                      border: '1px solid var(--card-border)',
                      borderRadius: 'var(--border-radius-small)',
                      mb: 1,
                      backgroundColor: calendar.id === defaultCalendarId ? 'rgba(var(--primary-rgb, 158, 127, 255), 0.1)' : 'transparent'
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {calendar.name}
                          </Typography>
                          {calendar.id === defaultCalendarId && (
                            <Chip
                              label="Default"
                              size="small"
                              color="primary"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                            {calendar.url}
                          </Typography>
                          <Switch
                            edge="end"
                            size="small"
                            checked={calendar.enabled === 1}
                            onChange={() => handleToggleCalendar(calendar.id, calendar.enabled)}
                            disabled={calendar.id === defaultCalendarId && calendar.enabled === 1}
                          />
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                            {calendar.enabled === 1 ? 'Enabled' : 'Disabled'}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      {calendar.id !== defaultCalendarId && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSetDefaultCalendar(calendar.id)}
                          sx={{ mr: 1 }}
                        >
                          Set as Default
                        </Button>
                      )}
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleEditCalendar(calendar)}
                        sx={{ mr: 1 }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDeleteCalendar(calendar.id)}
                        color="error"
                        disabled={calendar.id === defaultCalendarId}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            {calendarSources.length > 0 && !defaultCalendarId && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No default calendar set. Please set a default calendar to use todos and notes features.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar Add/Edit Dialog */}
      <Dialog
        open={showCalendarDialog}
        onClose={() => setShowCalendarDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCalendar ? 'Edit CalDAV Calendar' : 'Add CalDAV Calendar'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Calendar Name"
            value={calendarForm.name}
            onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="CalDAV URL"
            value={calendarForm.url}
            onChange={(e) => setCalendarForm({ ...calendarForm, url: e.target.value })}
            margin="normal"
            placeholder="https://caldav.example.com/calendar/"
            helperText="Your CalDAV server calendar URL"
            required
          />
          <TextField
            fullWidth
            label="Username"
            value={calendarForm.username}
            onChange={(e) => setCalendarForm({ ...calendarForm, username: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={calendarForm.password}
            onChange={(e) => setCalendarForm({ ...calendarForm, password: e.target.value })}
            margin="normal"
            helperText={editingCalendar ? "Leave blank to keep existing password" : "Password for CalDAV authentication"}
            required={!editingCalendar}
          />
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
              Calendar Color
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  backgroundColor: calendarForm.color,
                  border: '2px solid var(--card-border)',
                  borderRadius: 'var(--border-radius-small)',
                  cursor: 'pointer'
                }}
                onClick={() => setShowColorPicker({ ...showColorPicker, calendar: true })}
              />
              {showColorPicker.calendar && (
                <Box sx={{ position: 'absolute', zIndex: 1300 }}>
                  <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setShowColorPicker({ ...showColorPicker, calendar: false })} />
                  <ChromePicker
                    color={calendarForm.color}
                    onChange={(color) => setCalendarForm({ ...calendarForm, color: color.hex })}
                  />
                </Box>
              )}
            </Box>
          </Box>

          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {editingCalendar && (
            <Button
              onClick={handleTestConnection}
              disabled={testingConnection}
              startIcon={testingConnection ? <CircularProgress size={16} /> : <Refresh />}
            >
              Test Connection
            </Button>
          )}
          <Button onClick={() => setShowCalendarDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveCalendar}
            variant="contained"
            disabled={savingCalendar || !calendarForm.name || !calendarForm.url || !calendarForm.username || (!calendarForm.password && !editingCalendar)}
          >
            {savingCalendar ? 'Saving...' : editingCalendar ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photos Tab */}
      {activeTab === 3 && isAuthenticated && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Photo Management</Typography>

            {/* Photo Sources Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Photo Sources</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingPhotoSource(null);
                    setPhotoSourceForm({
                      name: '',
                      type: 'Immich',
                      url: '',
                      api_key: '',
                      album_id: '',
                      refresh_token: ''
                    });
                    setPhotoTestResult(null);
                    setShowPhotoSourceDialog(true);
                  }}
                  sx={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text)',
                    '&:hover': {
                      backgroundColor: 'var(--primary)',
                      opacity: 0.9
                    }
                  }}
                >
                  Add Source
                </Button>
              </Box>

              <List>
                {photoSources.map((source) => (
                  <ListItem
                    key={source.id}
                    sx={{
                      border: '1px solid var(--card-border)',
                      borderRadius: 'var(--border-radius-small)',
                      mb: 1,
                      backgroundColor: 'var(--card-bg)'
                    }}
                  >
                    <ListItemText
                      primary={source.name}
                      secondary={source.type}
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        size="small"
                        checked={source.enabled === 1}
                        onChange={async () => {
                          try {
                            await axios.patch(`${getApiUrl()}/api/photo-sources/${source.id}`, {
                              enabled: !source.enabled
                            });
                            await fetchPhotoSources();
                          } catch (error) {
                            console.error('Error toggling photo source:', error);
                            alert('Failed to toggle source. Please try again.');
                          }
                        }}
                        sx={{ mr: 1 }}
                      />
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setEditingPhotoSource(source);
                          setPhotoSourceForm({
                            name: source.name,
                            type: source.type,
                            url: source.url || '',
                            api_key: '',
                            album_id: source.album_id || '',
                            refresh_token: ''
                          });
                          setPhotoTestResult(null);
                          setShowPhotoSourceDialog(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this photo source?')) {
                            try {
                              await axios.delete(`${getApiUrl()}/api/photo-sources/${source.id}`);
                              await fetchPhotoSources();
                            } catch (error) {
                              console.error('Error deleting photo source:', error);
                              alert('Failed to delete source. Please try again.');
                            }
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              {photoSources.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No photo sources configured. Click "Add Source" to create one.
                </Typography>
              )}
            </Box>

          </CardContent>
        </Card>
      )}

      {/* Interface Tab */}
      {activeTab === 4 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Theme Customization</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<CloudDownload />}
                  onClick={handleExportTheme}
                  size="small"
                >
                  Export
                </Button>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<Upload />}
                  size="small"
                >
                  Import
                  <input
                    type="file"
                    hidden
                    accept=".json"
                    onChange={handleImportTheme}
                  />
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RestartAlt />}
                  onClick={() => {
                    setThemeSettings(defaultThemeSettings);
                    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                    applyThemeSettings(defaultThemeSettings, currentTheme, true);
                  }}
                  size="small"
                >
                  Reset All
                </Button>
              </Box>
            </Box>

            {saveMessage.show && (
              <Alert severity={saveMessage.type} sx={{ mb: 2 }}>
                {saveMessage.text}
              </Alert>
            )}

            {/* Theme Sub-tabs */}
            <Tabs 
              value={themeSubTab} 
              onChange={(e, newValue) => setThemeSubTab(newValue)} 
              sx={{ mb: 3 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="🎭 Presets" />
              <Tab label="🎨 Colors" />
              <Tab label="📝 Typography" />
              <Tab label="📏 Spacing" />
              <Tab label="🔲 Borders" />
              <Tab label="🌑 Shadows" />
              <Tab label="📅 Calendar" />
              <Tab label="🖼️ Media" />
              <Tab label="📷 Photos" />
              <Tab label="🌤️ Weather" />
            </Tabs>

            {/* Presets Tab */}
            {themeSubTab === 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Theme Presets</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Apply a pre-built theme or save your current settings as a custom preset.
                </Alert>

                <Grid container spacing={2}>
                  {Object.entries(themePresets).map(([key, preset]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: 'transparent',
                          '&:hover': {
                            borderColor: 'var(--accent)',
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s'
                          }
                        }}
                        onClick={() => applyPreset(key)}
                      >
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 1 }}>{preset.name}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                            <Box sx={{ width: 30, height: 30, backgroundColor: preset.settings.colors.light.primary, borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 30, backgroundColor: preset.settings.colors.light.secondary, borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 30, backgroundColor: preset.settings.colors.light.accent, borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 30, backgroundColor: preset.settings.colors.dark.primary, borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 30, backgroundColor: preset.settings.colors.dark.secondary, borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 30, backgroundColor: preset.settings.colors.dark.accent, borderRadius: 1 }} />
                          </Box>
                          <Button 
                            variant="outlined" 
                            fullWidth 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              applyPreset(key);
                            }}
                          >
                            Apply
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Save Current Theme as Preset</Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Save your current theme settings as a custom preset that you can apply later.
                  </Alert>
                  <Button
                    variant="contained"
                    onClick={saveThemeSettingsHandler}
                    startIcon={<Save />}
                    size="large"
                  >
                    Save Current Theme
                  </Button>
                </Box>
              </Box>
            )}

            {/* Color Palette Tab */}
            {themeSubTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Color Palette</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={previewTheme === 'light' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setPreviewTheme('light');
                    // Preview only - don't change actual theme
                    applyThemeSettings(themeSettings, 'light', true);
                  }}
                    >
                      Light
                    </Button>
                    <Button
                      size="small"
                      variant={previewTheme === 'dark' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setPreviewTheme('dark');
                    // Preview only - don't change actual theme
                    applyThemeSettings(themeSettings, 'dark', true);
                  }}
                    >
                      Dark
                    </Button>
                  </Box>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  Customize colors for the {previewTheme} theme. Switch between themes to customize both separately.
                </Alert>

                {/* Live Preview */}
                <Box sx={{ mb: 3, p: 2, border: '1px solid var(--card-border)', borderRadius: 2, backgroundColor: 'var(--card-bg)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Live Preview</Typography>
                  <Box 
                    sx={{ 
                      p: 2, 
                      borderRadius: 'var(--border-radius-small)',
                      backgroundColor: themeSettings.colors?.[previewTheme]?.cardBg || defaultThemeSettings.colors[previewTheme].cardBg,
                      border: `1px solid ${themeSettings.colors?.[previewTheme]?.cardBorder || defaultThemeSettings.colors[previewTheme].cardBorder}`,
                      boxShadow: themeSettings.shadows?.elevation1 || defaultThemeSettings.shadows.elevation1
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: themeSettings.colors?.[previewTheme]?.text || defaultThemeSettings.colors[previewTheme].text,
                        mb: 1,
                        fontFamily: themeSettings.typography?.fontFamily || defaultThemeSettings.typography.fontFamily,
                        fontSize: `${themeSettings.typography?.baseFontSize || defaultThemeSettings.typography.baseFontSize}px`,
                        lineHeight: themeSettings.typography?.lineHeight || defaultThemeSettings.typography.lineHeight,
                        letterSpacing: `${themeSettings.typography?.letterSpacing || defaultThemeSettings.typography.letterSpacing}em`,
                        fontWeight: themeSettings.typography?.fontWeight || defaultThemeSettings.typography.fontWeight
                      }}
                    >
                      Sample Widget Title
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: themeSettings.colors?.[previewTheme]?.textSecondary || defaultThemeSettings.colors[previewTheme].textSecondary,
                        mb: 2
                      }}
                    >
                      This is a preview of how your theme will look.
                    </Typography>
                    <Button 
                      variant="contained"
                      sx={{
                        backgroundColor: themeSettings.colors?.[previewTheme]?.primary || defaultThemeSettings.colors[previewTheme].primary,
                        color: 'var(--text)',
                        '&:hover': {
                          backgroundColor: themeSettings.colors?.[previewTheme]?.primary || defaultThemeSettings.colors[previewTheme].primary,
                          opacity: 0.9
                        }
                      }}
                    >
                      Sample Button
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  {/* Light/Dark Theme Colors */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Base Colors
                    </Typography>
                    {renderThemeColorPicker(previewTheme, 'background', 'Background')}
                    {renderThemeColorPicker(previewTheme, 'surface', 'Surface')}
                    {renderThemeColorPicker(previewTheme, 'cardBg', 'Card Background')}
                    {renderThemeColorPicker(previewTheme, 'text', 'Text (Primary)')}
                    {renderThemeColorPicker(previewTheme, 'textSecondary', 'Text (Secondary)')}
                    {renderThemeColorPicker(previewTheme, 'border', 'Border')}
                    {renderThemeColorPicker(previewTheme, 'cardBorder', 'Card Border')}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Accent & Status Colors
                    </Typography>
                    {renderThemeColorPicker(previewTheme, 'primary', 'Primary')}
                    {renderThemeColorPicker(previewTheme, 'secondary', 'Secondary')}
                    {renderThemeColorPicker(previewTheme, 'accent', 'Accent')}
                    {renderThemeColorPicker(previewTheme, 'success', 'Success')}
                    {renderThemeColorPicker(previewTheme, 'warning', 'Warning')}
                    {renderThemeColorPicker(previewTheme, 'error', 'Error')}
                  </Grid>

                  {/* Gradient Colors */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Gradient Colors
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        {renderThemeColorPicker(null, 'lightGradientStart', 'Light Gradient Start', 'gradients')}
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        {renderThemeColorPicker(null, 'lightGradientEnd', 'Light Gradient End', 'gradients')}
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        {renderThemeColorPicker(null, 'darkGradientStart', 'Dark Gradient Start', 'gradients')}
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        {renderThemeColorPicker(null, 'darkGradientEnd', 'Dark Gradient End', 'gradients')}
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    onClick={saveThemeSettingsHandler}
                    startIcon={<Save />}
                    size="large"
                  >
                    Save Colors
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => resetThemeSection('colors')}
                    startIcon={<RestartAlt />}
                    size="large"
                  >
                    Reset Colors
                  </Button>
                </Box>
              </Box>
            )}

            {/* Typography Tab */}
            {themeSubTab === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Typography</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>Font Family</InputLabel>
                      <Select
                        value={themeSettings.typography?.fontFamily || 'Inter'}
                        onChange={(e) => handleThemeSettingChange('typography.fontFamily', e.target.value)}
                        label="Font Family"
                      >
                        <MenuItem value="Inter">Inter</MenuItem>
                        <MenuItem value="Roboto">Roboto</MenuItem>
                        <MenuItem value="'Open Sans'">Open Sans</MenuItem>
                        <MenuItem value="system-ui">System</MenuItem>
                        <MenuItem value="'Courier New'">Courier New (Monospace)</MenuItem>
                      </Select>
                    </FormControl>

                    <Typography variant="body2" sx={{ mb: 1 }}>Base Font Size: {themeSettings.typography?.baseFontSize || 16}px</Typography>
                    <Slider
                      value={themeSettings.typography?.baseFontSize || 16}
                      onChange={(e, value) => handleThemeSettingChange('typography.baseFontSize', value)}
                      min={12}
                      max={20}
                      step={1}
                      marks
                      sx={{ mb: 3 }}
                    />

                    <Typography variant="body2" sx={{ mb: 1 }}>Line Height: {themeSettings.typography?.lineHeight || 1.5}</Typography>
                    <Slider
                      value={themeSettings.typography?.lineHeight || 1.5}
                      onChange={(e, value) => handleThemeSettingChange('typography.lineHeight', value)}
                      min={1.2}
                      max={2.0}
                      step={0.1}
                      marks={[
                        { value: 1.2, label: '1.2' },
                        { value: 1.5, label: '1.5' },
                        { value: 2.0, label: '2.0' }
                      ]}
                      sx={{ mb: 3 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Letter Spacing: {themeSettings.typography?.letterSpacing || -0.01}em</Typography>
                    <Slider
                      value={themeSettings.typography?.letterSpacing || -0.01}
                      onChange={(e, value) => handleThemeSettingChange('typography.letterSpacing', value)}
                      min={-0.05}
                      max={0.1}
                      step={0.01}
                      marks={[
                        { value: -0.05, label: '-0.05' },
                        { value: 0, label: '0' },
                        { value: 0.1, label: '0.1' }
                      ]}
                      sx={{ mb: 3 }}
                    />

                    <FormControl fullWidth>
                      <InputLabel>Font Weight</InputLabel>
                      <Select
                        value={themeSettings.typography?.fontWeight || 400}
                        onChange={(e) => handleThemeSettingChange('typography.fontWeight', e.target.value)}
                        label="Font Weight"
                      >
                        <MenuItem value={300}>300 - Light</MenuItem>
                        <MenuItem value={400}>400 - Regular</MenuItem>
                        <MenuItem value={500}>500 - Medium</MenuItem>
                        <MenuItem value={600}>600 - Semi Bold</MenuItem>
                        <MenuItem value={700}>700 - Bold</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    onClick={saveThemeSettingsHandler}
                    startIcon={<Save />}
                    size="large"
                  >
                    Save Typography
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => resetThemeSection('typography')}
                    startIcon={<RestartAlt />}
                    size="large"
                  >
                    Reset Typography
                  </Button>
                </Box>
              </Box>
            )}

            {/* Spacing Tab */}
            {themeSubTab === 3 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Spacing</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Spacing Scale</Typography>
                    {renderSpacingSlider('xs', 'Extra Small', 2, 8)}
                    {renderSpacingSlider('sm', 'Small', 4, 16)}
                    {renderSpacingSlider('md', 'Medium', 8, 32)}
                    {renderSpacingSlider('lg', 'Large', 16, 48)}
                    {renderSpacingSlider('xl', 'Extra Large', 24, 64)}
                    {renderSpacingSlider('xxl', 'Extra Extra Large', 32, 96)}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Layout Spacing</Typography>
                    {renderSpacingSlider('widgetPadding', 'Widget Padding', 8, 32)}
                    {renderSpacingSlider('widgetMargin', 'Widget Margin', 8, 48)}
                    {renderSpacingSlider('containerPadding', 'Container Padding', 8, 48)}
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    onClick={saveThemeSettingsHandler}
                    startIcon={<Save />}
                    size="large"
                  >
                    Save Spacing
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => resetThemeSection('spacing')}
                    startIcon={<RestartAlt />}
                    size="large"
                  >
                    Reset Spacing
                  </Button>
                </Box>
              </Box>
            )}

            {/* Borders Tab */}
            {themeSubTab === 4 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Borders</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Border Radius</Typography>
                    {renderBorderRadiusSlider('radiusSmall', 'Small', 4, 16)}
                    {renderBorderRadiusSlider('radiusMedium', 'Medium', 8, 24)}
                    {renderBorderRadiusSlider('radiusLarge', 'Large', 12, 32)}
                    {renderBorderRadiusSlider('radiusXLarge', 'Extra Large', 16, 48)}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Border Style</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>Border Width: {themeSettings.borders?.width || 1}px</Typography>
                    <Slider
                      value={themeSettings.borders?.width || 1}
                      onChange={(e, value) => handleThemeSettingChange('borders.width', value)}
                      min={0}
                      max={4}
                      step={1}
                      marks
                      sx={{ mb: 3 }}
                    />

                    <FormControl fullWidth>
                      <InputLabel>Border Style</InputLabel>
                      <Select
                        value={themeSettings.borders?.style || 'solid'}
                        onChange={(e) => handleThemeSettingChange('borders.style', e.target.value)}
                        label="Border Style"
                      >
                        <MenuItem value="solid">Solid</MenuItem>
                        <MenuItem value="dashed">Dashed</MenuItem>
                        <MenuItem value="dotted">Dotted</MenuItem>
                        <MenuItem value="none">None</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    onClick={saveThemeSettingsHandler}
                    startIcon={<Save />}
                    size="large"
                  >
                    Save Borders
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => resetThemeSection('borders')}
                    startIcon={<RestartAlt />}
                    size="large"
                  >
                    Reset Borders
                  </Button>
                </Box>
              </Box>
            )}

            {/* Shadows Tab */}
            {themeSubTab === 5 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Shadows & Elevation</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Customize the elevation system used for cards and widgets. Higher elevation means more prominent shadows.
                </Alert>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Elevation Level 1</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={themeSettings.shadows?.elevation1 || ''}
                      onChange={(e) => handleThemeSettingChange('shadows.elevation1', e.target.value)}
                      placeholder="0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)"
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: 'var(--card-bg)', 
                      borderRadius: 'var(--border-radius-small)',
                      boxShadow: themeSettings.shadows?.elevation1 || 'none'
                    }}>
                      <Typography variant="body2">Preview</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Elevation Level 2</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={themeSettings.shadows?.elevation2 || ''}
                      onChange={(e) => handleThemeSettingChange('shadows.elevation2', e.target.value)}
                      placeholder="0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)"
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: 'var(--card-bg)', 
                      borderRadius: 'var(--border-radius-small)',
                      boxShadow: themeSettings.shadows?.elevation2 || 'none'
                    }}>
                      <Typography variant="body2">Preview</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Elevation Level 3</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={themeSettings.shadows?.elevation3 || ''}
                      onChange={(e) => handleThemeSettingChange('shadows.elevation3', e.target.value)}
                      placeholder="0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)"
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: 'var(--card-bg)', 
                      borderRadius: 'var(--border-radius-small)',
                      boxShadow: themeSettings.shadows?.elevation3 || 'none'
                    }}>
                      <Typography variant="body2">Preview</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    onClick={saveThemeSettingsHandler}
                    startIcon={<Save />}
                    size="large"
                  >
                    Save Shadows
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => resetThemeSection('shadows')}
                    startIcon={<RestartAlt />}
                    size="large"
                  >
                    Reset Shadows
                  </Button>
                </Box>
              </Box>
            )}

            {/* Calendar Tab */}
            {themeSubTab === 6 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Calendar Widget Settings</Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>Event Colors</Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Event Background Color</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: calendarSettings.eventBackgroundColor,
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--border-radius-small)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowColorPicker(prev => ({ ...prev, calendarBg: !prev.calendarBg }))}
                        />
                        <TextField
                          size="small"
                          value={calendarSettings.eventBackgroundColor}
                          onChange={(e) => {
                            setCalendarSettings({ ...calendarSettings, eventBackgroundColor: e.target.value });
                            saveCalendarSetting('CALENDAR_EVENT_BACKGROUND_COLOR', e.target.value);
                          }}
                          sx={{ flex: 1 }}
                        />
                      </Box>
                      {showColorPicker.calendarBg && (
                        <Box sx={{ mb: 2 }}>
                          <ChromePicker
                            color={calendarSettings.eventBackgroundColor}
                            onChange={(color) => {
                              setCalendarSettings({ ...calendarSettings, eventBackgroundColor: color.hex });
                              saveCalendarSetting('CALENDAR_EVENT_BACKGROUND_COLOR', color.hex);
                            }}
                          />
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Event Text Color</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: calendarSettings.eventTextColor,
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--border-radius-small)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowColorPicker(prev => ({ ...prev, calendarText: !prev.calendarText }))}
                        />
                        <TextField
                          size="small"
                          value={calendarSettings.eventTextColor}
                          onChange={(e) => {
                            setCalendarSettings({ ...calendarSettings, eventTextColor: e.target.value });
                            saveCalendarSetting('CALENDAR_EVENT_TEXT_COLOR', e.target.value);
                          }}
                          sx={{ flex: 1 }}
                        />
                      </Box>
                      {showColorPicker.calendarText && (
                        <Box sx={{ mb: 2 }}>
                          <ChromePicker
                            color={calendarSettings.eventTextColor}
                            onChange={(color) => {
                              setCalendarSettings({ ...calendarSettings, eventTextColor: color.hex });
                              saveCalendarSetting('CALENDAR_EVENT_TEXT_COLOR', color.hex);
                            }}
                          />
                        </Box>
                      )}
                    </Box>

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        setCalendarSettings({
                          eventBackgroundColor: '#6e44ff',
                          eventTextColor: '#ffffff',
                          textSize: calendarSettings.textSize,
                          bulletSize: calendarSettings.bulletSize
                        });
                        saveCalendarSetting('CALENDAR_EVENT_BACKGROUND_COLOR', '#6e44ff');
                        saveCalendarSetting('CALENDAR_EVENT_TEXT_COLOR', '#ffffff');
                        setShowColorPicker({ calendarBg: false, calendarText: false });
                      }}
                    >
                      Reset to Default
                    </Button>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>Display Settings</Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Event Text Size</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newSize = Math.max(8, calendarSettings.textSize - 1);
                            setCalendarSettings({ ...calendarSettings, textSize: newSize });
                            saveCalendarSetting('CALENDAR_TEXT_SIZE', newSize);
                          }}
                          disabled={calendarSettings.textSize <= 8}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          size="small"
                          type="number"
                          value={calendarSettings.textSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 12;
                            const clamped = Math.max(8, Math.min(24, value));
                            setCalendarSettings({ ...calendarSettings, textSize: clamped });
                            saveCalendarSetting('CALENDAR_TEXT_SIZE', clamped);
                          }}
                          inputProps={{ min: 8, max: 24 }}
                          sx={{ width: 80 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newSize = Math.min(24, calendarSettings.textSize + 1);
                            setCalendarSettings({ ...calendarSettings, textSize: newSize });
                            saveCalendarSetting('CALENDAR_TEXT_SIZE', newSize);
                          }}
                          disabled={calendarSettings.textSize >= 24}
                        >
                          <Add />
                        </IconButton>
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {calendarSettings.textSize}px
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Bullet Size</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newSize = Math.max(6, calendarSettings.bulletSize - 1);
                            setCalendarSettings({ ...calendarSettings, bulletSize: newSize });
                            saveCalendarSetting('CALENDAR_BULLET_SIZE', newSize);
                          }}
                          disabled={calendarSettings.bulletSize <= 6}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          size="small"
                          type="number"
                          value={calendarSettings.bulletSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 10;
                            const clamped = Math.max(6, Math.min(20, value));
                            setCalendarSettings({ ...calendarSettings, bulletSize: clamped });
                            saveCalendarSetting('CALENDAR_BULLET_SIZE', clamped);
                          }}
                          inputProps={{ min: 6, max: 20 }}
                          sx={{ width: 80 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newSize = Math.min(20, calendarSettings.bulletSize + 1);
                            setCalendarSettings({ ...calendarSettings, bulletSize: newSize });
                            saveCalendarSetting('CALENDAR_BULLET_SIZE', newSize);
                          }}
                          disabled={calendarSettings.bulletSize >= 20}
                        >
                          <Add />
                        </IconButton>
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {calendarSettings.bulletSize}px
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Media Tab */}
            {themeSubTab === 7 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Media Settings</Typography>
                
                <TextField
                  fullWidth
                  label="Logo Filename"
                  value={settings.LOGO_FILENAME || 'MindPalaceMobileLogo.png'}
                  onChange={(e) => setSettings(prev => ({ ...prev, LOGO_FILENAME: e.target.value }))}
                  sx={{ mb: 2 }}
                  helperText="Filename of the logo image in the public folder (e.g., MindPalaceMobileLogo.png)"
                />
                
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      await axios.post(`${getApiUrl()}/api/settings`, { 
                        key: 'LOGO_FILENAME', 
                        value: settings.LOGO_FILENAME || 'MindPalaceMobileLogo.png' 
                      });
                      setSaveMessage({ show: true, type: 'success', text: 'Logo filename saved successfully!' });
                      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
                      if (onSettingsSaved) {
                        onSettingsSaved();
                      }
                    } catch (error) {
                      console.error('Error saving logo filename:', error);
                      setSaveMessage({ show: true, type: 'error', text: 'Failed to save logo filename.' });
                      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
                    }
                  }}
                  startIcon={<Save />}
                  sx={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text)',
                    '&:hover': {
                      backgroundColor: 'var(--primary)',
                      opacity: 0.9
                    }
                  }}
                >
                  Save Logo Filename
                </Button>

                <FormControl fullWidth sx={{ mt: 3 }}>
                  <InputLabel>Orientation</InputLabel>
                  <Select
                    value={settings.ORIENTATION || 'portrait'}
                    label="Orientation"
                    onChange={(e) => setSettings(prev => ({ ...prev, ORIENTATION: e.target.value }))}
                  >
                    <MenuItem value="portrait">Portrait</MenuItem>
                    <MenuItem value="landscape">Landscape</MenuItem>
                  </Select>
                  <FormHelperText>Optimize widget layouts for vertical (Portrait) or horizontal (Landscape) displays</FormHelperText>
                </FormControl>

                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      await axios.post(`${getApiUrl()}/api/settings`, { 
                        key: 'ORIENTATION', 
                        value: settings.ORIENTATION || 'portrait' 
                      });
                      setSaveMessage({ show: true, type: 'success', text: 'Orientation saved successfully!' });
                      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
                    } catch (error) {
                      console.error('Error saving orientation:', error);
                      setSaveMessage({ show: true, type: 'error', text: 'Failed to save orientation.' });
                      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
                    }
                  }}
                  startIcon={<Save />}
                  sx={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--text)',
                    mt: 2,
                    '&:hover': {
                      backgroundColor: 'var(--accent)',
                      opacity: 0.9
                    }
                  }}
                >
                  Save Orientation
                </Button>
              </Box>
            )}

            {/* Photos Tab */}
            {themeSubTab === 8 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Photos Widget Settings</Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Max Photos Per View</InputLabel>
                  <Select
                    value={photoWidgetSettings.maxPhotosPerView}
                    label="Max Photos Per View"
                    onChange={(e) => {
                      const value = e.target.value;
                      setPhotoWidgetSettings({ ...photoWidgetSettings, maxPhotosPerView: value });
                      savePhotoWidgetSetting('PHOTO_WIDGET_MAX_PHOTOS_PER_VIEW', value);
                    }}
                  >
                    <MenuItem value={1}>1 Photo</MenuItem>
                    <MenuItem value={2}>2 Photos</MenuItem>
                    <MenuItem value={3}>3 Photos</MenuItem>
                    <MenuItem value={4}>4 Photos</MenuItem>
                    <MenuItem value={5}>5 Photos</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Shows up to this many photos with matching orientation
                  </Typography>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Transition Effect</InputLabel>
                  <Select
                    value={photoWidgetSettings.transitionType}
                    label="Transition Effect"
                    onChange={(e) => {
                      const value = e.target.value;
                      setPhotoWidgetSettings({ ...photoWidgetSettings, transitionType: value });
                      savePhotoWidgetSetting('PHOTO_WIDGET_TRANSITION_TYPE', value);
                    }}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="fade">Fade</MenuItem>
                    <MenuItem value="slide">Slide</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Slideshow Speed</InputLabel>
                  <Select
                    value={photoWidgetSettings.slideshowInterval}
                    label="Slideshow Speed"
                    onChange={(e) => {
                      const value = e.target.value;
                      setPhotoWidgetSettings({ ...photoWidgetSettings, slideshowInterval: value });
                      savePhotoWidgetSetting('PHOTO_WIDGET_SLIDESHOW_INTERVAL', value);
                    }}
                  >
                    <MenuItem value={3000}>Fast (3s)</MenuItem>
                    <MenuItem value={5000}>Normal (5s)</MenuItem>
                    <MenuItem value={10000}>Slow (10s)</MenuItem>
                    <MenuItem value={30000}>Very Slow (30s)</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={photoWidgetSettings.showPhotoCount}
                      onChange={(e) => {
                        const value = e.target.checked;
                        setPhotoWidgetSettings({ ...photoWidgetSettings, showPhotoCount: value });
                        savePhotoWidgetSetting('PHOTO_WIDGET_SHOW_PHOTO_COUNT', value);
                      }}
                    />
                  }
                  label="Show Photo Count"
                  sx={{ mb: 2 }}
                />
              </Box>
            )}

            {/* Weather Tab */}
            {themeSubTab === 9 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Weather Widget Settings</Typography>

                <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Weather Location</Typography>
                <TextField
                  fullWidth
                  label="Zip Code"
                  value={settings.WEATHER_ZIP_CODE || '14818'}
                  onChange={(e) => setSettings(prev => ({ ...prev, WEATHER_ZIP_CODE: e.target.value }))}
                  sx={{ mb: 2 }}
                  helperText="US zip code for weather data (e.g., 14818)"
                />
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      await axios.post(`${getApiUrl()}/api/settings`, {
                        key: 'WEATHER_ZIP_CODE',
                        value: settings.WEATHER_ZIP_CODE || '14818'
                      });
                      setSaveMessage({ show: true, type: 'success', text: 'Weather zip code saved successfully!' });
                      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
                    } catch (error) {
                      console.error('Error saving weather zip code:', error);
                      setSaveMessage({ show: true, type: 'error', text: 'Failed to save weather zip code.' });
                      setTimeout(() => setSaveMessage({ show: false, type: '', text: '' }), 3000);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  startIcon={<Save />}
                  sx={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text)',
                    '&:hover': {
                      backgroundColor: 'var(--primary)',
                      opacity: 0.9
                    }
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save Zip Code'}
                </Button>

                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>Layout Mode</Typography>
                <Box sx={{ mt: 3, p: 2, border: '1px solid var(--card-border)', borderRadius: 1, bgcolor: 'rgba(var(--text-rgb), 0.02)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ViewModule />
                    Layout Mode
                  </Typography>
                  
                  <RadioGroup
                    value={widgetSettings.weather?.layoutMode || 'medium'}
                    onChange={(e) => handleWeatherLayoutModeChange(e.target.value)}
                  >
                    <FormControlLabel
                      value="compact"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ViewCompact />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              Compact
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Current weather only (minimal space)
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    
                    <FormControlLabel
                      value="medium"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ViewModule />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              Medium
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Current weather + 3-day forecast
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    
                    <FormControlLabel
                      value="full"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ViewQuilt />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              Full
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              All information with charts and air quality
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </RadioGroup>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Compact:</strong> Shows only current weather conditions. Best for minimal space usage.
                      <br />
                      <strong>Medium:</strong> Displays current weather plus a 3-day forecast. Balanced information and space.
                      <br />
                      <strong>Full:</strong> Complete weather information including charts, air quality, and extended forecast. Maximum detail.
                    </Typography>
                  </Alert>
                </Box>
              </Box>
            )}

          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 5 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>User Management</Typography>
            
            <Box sx={{ mb: 3, p: 2, border: '1px solid var(--card-border)', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Chore Settings</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bonus Chore Clam Value"
                    type="number"
                    value={bonusChoreClamValue}
                    onChange={(e) => setBonusChoreClamValue(parseInt(e.target.value) || 1)}
                    helperText="Default clam value for bonus chores"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    onClick={saveBonusChoreClamValue}
                    disabled={!isAuthenticated}
                    fullWidth
                    sx={{ height: '56px', mt: 1 }}
                  >
                    Save Bonus Chore Value
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mb: 3, p: 2, border: '1px solid var(--card-border)', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New User</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    onClick={saveUser}
                    disabled={!newUser.username || !newUser.email}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Add User
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Avatar</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Clam Total</TableCell>
                    <TableCell>Chores</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: 'column' }}>
                          {renderUserAvatar(user)}
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Button
                              component="label"
                              size="small"
                              variant="outlined"
                            >
                              Upload
                              <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={(e) => handleProfilePictureUpload(user.id, e)}
                              />
                            </Button>
                            {editingUser?.id === user.id ? (
                              <TextField
                                label="Filename"
                                value={editingUser.profile_picture || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, profile_picture: e.target.value })}
                                size="small"
                                sx={{ width: 150 }}
                                placeholder="image.png"
                                helperText="Filename in /Uploads/users/"
                              />
                            ) : (
                              <TextField
                                label="Filename"
                                value={user.profile_picture || ''}
                                size="small"
                                sx={{ width: 150 }}
                                disabled
                                placeholder="No image"
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {editingUser?.id === user.id ? (
                          <TextField
                            value={editingUser.username}
                            onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                            size="small"
                          />
                        ) : (
                          user.username
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser?.id === user.id ? (
                          <TextField
                            value={editingUser.email}
                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                            size="small"
                          />
                        ) : (
                          user.email
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={`${user.clam_total || 0} 🥟`}
                            color="primary"
                            size="small"
                          />
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 80 }}
                            defaultValue={user.clam_total || 0}
                            onBlur={(e) => {
                              const newTotal = parseInt(e.target.value) || 0;
                              if (newTotal !== user.clam_total) {
                                updateUserClams(user.id, newTotal);
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openChoreModal(user)}
                            sx={{ minWidth: 'auto' }}
                          >
                            {getUserChoreCount(user.id)} chores
                          </Button>
                          {getUserChoreCount(user.id) > 0 && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<Delete />}
                              onClick={() => deleteAllUserChores(user.id)}
                              sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                            >
                              Delete All
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {editingUser?.id === user.id ? (
                            <>
                              <IconButton onClick={saveUser} color="primary" size="small">
                                <Save />
                              </IconButton>
                              <IconButton onClick={() => setEditingUser(null)} size="small">
                                <Cancel />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton
                                onClick={() => setEditingUser({ ...user })}
                                color="primary"
                                size="small"
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                onClick={() => handleUserDelete(user)}
                                color="error"
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Prizes Tab */}
      {activeTab === 6 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Prize Management</Typography>
            
            <Box sx={{ mb: 3, p: 2, border: '1px solid var(--card-border)', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Prize Spinner Settings</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Minimum Shells Required"
                    type="number"
                    value={prizeMinimumShells}
                    onChange={(e) => setPrizeMinimumShells(parseInt(e.target.value) || 0)}
                    helperText="Users must have at least this many shells to spin for prizes"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    onClick={savePrizeMinimumShells}
                    disabled={!isAuthenticated}
                    fullWidth
                    sx={{ height: '56px', mt: 1 }}
                  >
                    Save Minimum Shells
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mb: 3, p: 2, border: '1px solid var(--card-border)', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New Prize</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Prize Name"
                    value={newPrize.name}
                    onChange={(e) => setNewPrize({ ...newPrize, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Emoji"
                    value={newPrize.emoji}
                    onChange={(e) => setNewPrize({ ...newPrize, emoji: e.target.value })}
                    placeholder="🎁"
                    helperText="Emoji shown on wheel"
                    inputProps={{ maxLength: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    label="Clam Cost"
                    type="number"
                    value={newPrize.clam_cost}
                    onChange={(e) => setNewPrize({ ...newPrize, clam_cost: parseInt(e.target.value) || 0 })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button
                    variant="contained"
                    onClick={savePrize}
                    disabled={!newPrize.name || newPrize.clam_cost <= 0}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Add Prize
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <List>
              {prizes.map((prize) => (
                <ListItem key={prize.id} sx={{ border: '1px solid var(--card-border)', borderRadius: 1, mb: 1 }}>
                  {editingPrize?.id === prize.id ? (
                    <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'center' }}>
                      <TextField
                        label="Prize Name"
                        value={editingPrize.name}
                        onChange={(e) => setEditingPrize({ ...editingPrize, name: e.target.value })}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Emoji"
                        value={editingPrize.emoji || ''}
                        onChange={(e) => setEditingPrize({ ...editingPrize, emoji: e.target.value })}
                        placeholder="🎁"
                        sx={{ width: 100 }}
                        inputProps={{ maxLength: 2 }}
                      />
                      <TextField
                        label="Clam Cost"
                        type="number"
                        value={editingPrize.clam_cost}
                        onChange={(e) => setEditingPrize({ ...editingPrize, clam_cost: parseInt(e.target.value) || 0 })}
                        sx={{ width: 120 }}
                      />
                      <IconButton onClick={savePrize} color="primary">
                        <Save />
                      </IconButton>
                      <IconButton onClick={() => setEditingPrize(null)}>
                        <Cancel />
                      </IconButton>
                    </Box>
                  ) : (
                    <>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {prize.emoji && <span>{prize.emoji}</span>}
                            <span>{prize.name}</span>
                          </Box>
                        }
                        secondary={`Cost: ${prize.clam_cost} 🥟`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => setEditingPrize({ ...prize })} color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => deletePrize(prize.id)} color="error">
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* House Rules Tab */}
      {activeTab === 7 && isAuthenticated && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">House Rules Management</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setEditingRule(null);
                  setRuleForm({ rule_text: '' });
                  setShowRuleDialog(true);
                }}
                sx={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--text)',
                  '&:hover': {
                    backgroundColor: 'var(--primary)',
                    opacity: 0.9
                  }
                }}
              >
                Add Rule
              </Button>
            </Box>

            <List>
              {houseRules.map((rule, index) => (
                <ListItem
                  key={rule.id}
                  sx={{
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--border-radius-small)',
                    mb: 1,
                    backgroundColor: 'var(--card-bg)'
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {rule.rule_text}
                      </Typography>
                    }
                    secondary={`Order: ${rule.order_index}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setEditingRule(rule);
                        setRuleForm({ rule_text: rule.rule_text });
                        setShowRuleDialog(true);
                      }}
                      sx={{ mr: 1 }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this rule?')) {
                          try {
                            await axios.delete(`${getApiUrl()}/api/house-rules/${rule.id}`, {
                              headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' }
                            });
                            await fetchHouseRules();
                          } catch (error) {
                            console.error('Error deleting rule:', error);
                            alert('Failed to delete rule. Please check your PIN.');
                          }
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {houseRules.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No house rules set. Click "Add Rule" to create one.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Marbles Tab */}
      {activeTab === 8 && isAuthenticated && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Marble Management</Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Settings</Typography>
              <TextField
                label="Daily Increment"
                type="number"
                value={marbleSettings.daily_increment || 3}
                onChange={async (e) => {
                  const value = parseInt(e.target.value) || 0;
                  try {
                    await axios.put(`${getApiUrl()}/api/marbles/settings`, { daily_increment: value }, {
                      headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' }
                    });
                    setMarbleSettings({ ...marbleSettings, daily_increment: value });
                  } catch (error) {
                    console.error('Error updating marble settings:', error);
                    alert('Failed to update settings. Please check your PIN.');
                  }
                }}
                sx={{ mb: 2, width: 200 }}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 2 }}>User Marbles</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enable marble tracking for users you want to track. Only tracked users will appear in the Marble Chart widget and receive daily increments.
            </Alert>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Track Marbles</TableCell>
                    <TableCell>Marble Count</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {marbles.map((marble) => (
                    <TableRow key={marble.user_id}>
                      <TableCell>{marble.username || `User ${marble.user_id}`}</TableCell>
                      <TableCell>
                        <Switch
                          checked={marble.track_marbles}
                          onChange={async () => {
                            try {
                              await axios.post(
                                `${getApiUrl()}/api/marbles/${marble.user_id}/toggle-tracking`,
                                {},
                                {
                                  headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' }
                                }
                              );
                              await fetchMarbles();
                            } catch (error) {
                              console.error('Error toggling marble tracking:', error);
                              alert('Failed to toggle tracking. Please check your PIN.');
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {marble.track_marbles ? marble.count : '-'}
                      </TableCell>
                      <TableCell>
                        {marble.track_marbles ? (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                setRemoveMarbleDialog({ open: true, user: marble });
                                setRemoveMarbleForm({ amount: '', reason: '' });
                              }}
                            >
                              Remove Marbles
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              sx={{ ml: 1 }}
                              onClick={() => {
                                setOverrideMarbleDialog({ open: true, user: marble });
                                setOverrideMarbleForm({ count: String(marble.count), reason: '' });
                              }}
                            >
                              Marble Override
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ ml: 1 }}
                              onClick={() => {
                                setSelectedMarbleUser(marble.user_id);
                                fetchMarbleHistory(marble.user_id);
                                setShowMarbleHistoryDialog(true);
                              }}
                            >
                              View History
                            </Button>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Enable tracking to manage marbles
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Plugins Tab */}
      {activeTab === 9 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Plugin Management</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Upload Custom Widget</Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<Upload />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Upload HTML Widget
                  <input
                    type="file"
                    hidden
                    accept=".html"
                    onChange={handleWidgetUpload}
                  />
                </Button>
                
                <Typography variant="subtitle1" gutterBottom>Uploaded Widgets</Typography>
                <List>
                  {uploadedWidgets.map((widget) => (
                    <ListItem key={widget.filename} sx={{ border: '1px solid var(--card-border)', borderRadius: 1, mb: 1 }}>
                      <ListItemText
                        primary={widget.name}
                        secondary={`File: ${widget.filename}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => deleteWidget(widget.filename)} color="error">
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">GitHub Widget Repository</Typography>
                  <Button
                    onClick={fetchGithubWidgets}
                    startIcon={loadingGithub ? <CircularProgress size={16} /> : <Refresh />}
                    disabled={loadingGithub}
                  >
                    Refresh
                  </Button>
                </Box>
                
                <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {githubWidgets.map((widget) => (
                    <ListItem key={widget.path} sx={{ border: '1px solid var(--card-border)', borderRadius: 1, mb: 1 }}>
                      <ListItemText
                        primary={widget.name}
                        secondary={widget.description}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          onClick={() => installGithubWidget(widget)}
                          startIcon={<CloudDownload />}
                          size="small"
                          variant="outlined"
                        >
                          Install
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* User Delete Confirmation Dialog */}
      <Dialog
        open={deleteUserDialog.open}
        onClose={() => setDeleteUserDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            <Typography variant="h6" component="span">Delete User</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete user <strong>{deleteUserDialog.user?.username}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will also delete all {getUserChoreCount(deleteUserDialog.user?.id || 0)} chores assigned to this user.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteUserDialog({ open: false, user: null })}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={() => deleteUser(deleteUserDialog.user?.id)}
            variant="contained"
            color="error"
            startIcon={<Delete />}
          >
            Delete User & Chores
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Chores Modal */}
      <Dialog
        open={choreModal.open}
        onClose={closeChoreModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="span">
              Chores for {choreModal.user?.username}
            </Typography>
            <Chip
              label={`${choreModal.userChores.length} total`}
              color="primary"
              size="small"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {choreModal.userChores.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No chores assigned to this user.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Repeat</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Clams</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {choreModal.userChores.map((chore) => (
                    <TableRow key={chore.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {chore.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {chore.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={chore.assigned_day_of_week}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {chore.time_period.replace('-', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {chore.repeat_type.replace('-', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={chore.completed ? 'Completed' : 'Pending'}
                          color={chore.completed ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {chore.clam_value > 0 ? (
                          <Chip
                            label={`${chore.clam_value} 🥟`}
                            color="primary"
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Regular
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => deleteChore(chore.id)}
                          color="error"
                          size="small"
                          title="Delete chore"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeChoreModal} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Indicator */}
      <Backdrop
        sx={{
          color: 'var(--text)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(var(--background-rgb), 0.3)',
        }}
        open={isLoading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            p: 4,
            borderRadius: 3,
            background: 'rgba(var(--text-rgb), 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(var(--text-rgb), 0.2)',
            boxShadow: '0 8px 32px rgba(var(--background-rgb), 0.3)',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {[0, 1, 2].map((index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  fontSize: '2rem',
                  animation: `clamBounce 1.5s ease-in-out ${index * 0.2}s infinite`,
                  '@keyframes clamBounce': {
                    '0%, 80%, 100%': {
                      transform: 'scale(0.8) translateY(0)',
                      opacity: 0.6,
                    },
                    '40%': {
                      transform: 'scale(1.2) translateY(-20px)',
                      opacity: 1,
                    },
                  },
                }}
              >
                🥟
              </Box>
            ))}
          </Box>
          
          <Typography
            variant="h6"
            sx={{
              color: 'var(--text)',
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(var(--background-rgb), 0.5)',
            }}
          >
            Processing...
          </Typography>
          
          <CircularProgress
            size={40}
            thickness={2}
            sx={{
              color: 'rgba(var(--text-rgb), 0.7)',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
        </Box>
      </Backdrop>
      {/* House Rule Dialog */}
      <Dialog
        open={showRuleDialog}
        onClose={() => setShowRuleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingRule ? 'Edit House Rule' : 'Add House Rule'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Rule Text (Markdown supported)"
            value={ruleForm.rule_text}
            onChange={(e) => setRuleForm({ ...ruleForm, rule_text: e.target.value })}
            sx={{ mt: 2 }}
            placeholder="Enter the house rule text. Markdown is supported."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRuleDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!ruleForm.rule_text.trim()) {
                alert('Please enter rule text.');
                return;
              }
              setSavingRule(true);
              try {
                const headers = { 'x-admin-pin': localStorage.getItem('adminPin') || '' };
                if (editingRule) {
                  await axios.put(`${getApiUrl()}/api/house-rules/${editingRule.id}`, ruleForm, { headers });
                } else {
                  await axios.post(`${getApiUrl()}/api/house-rules`, ruleForm, { headers });
                }
                await fetchHouseRules();
                setShowRuleDialog(false);
              } catch (error) {
                console.error('Error saving rule:', error);
                alert('Failed to save rule. Please check your PIN.');
              } finally {
                setSavingRule(false);
              }
            }}
            disabled={savingRule || !ruleForm.rule_text.trim()}
            sx={{
              backgroundColor: 'var(--primary)',
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--primary)',
                opacity: 0.9
              }
            }}
          >
            {savingRule ? 'Saving...' : editingRule ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Marble Dialog */}
      <Dialog
        open={removeMarbleDialog.open}
        onClose={() => setRemoveMarbleDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove Marbles</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Removing marbles from {removeMarbleDialog.user?.username || `User ${removeMarbleDialog.user?.user_id}`}
          </Typography>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={removeMarbleForm.amount}
            onChange={(e) => setRemoveMarbleForm({ ...removeMarbleForm, amount: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{ inputProps: { min: 1 } }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason (Required)"
            value={removeMarbleForm.reason}
            onChange={(e) => setRemoveMarbleForm({ ...removeMarbleForm, reason: e.target.value })}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveMarbleDialog({ open: false, user: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!removeMarbleForm.amount || !removeMarbleForm.reason.trim()) {
                alert('Please enter amount and reason.');
                return;
              }
              try {
                await axios.post(
                  `${getApiUrl()}/api/marbles/${removeMarbleDialog.user.user_id}/remove`,
                  {
                    amount: parseInt(removeMarbleForm.amount),
                    reason: removeMarbleForm.reason
                  },
                  {
                    headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' }
                  }
                );
                await fetchMarbles();
                setRemoveMarbleDialog({ open: false, user: null });
                setRemoveMarbleForm({ amount: '', reason: '' });
              } catch (error) {
                console.error('Error removing marbles:', error);
                alert('Failed to remove marbles. Please check your PIN.');
              }
            }}
            disabled={!removeMarbleForm.amount || !removeMarbleForm.reason.trim()}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Override Marble Dialog */}
      <Dialog
        open={overrideMarbleDialog.open}
        onClose={() => setOverrideMarbleDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Marble Override</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Overriding marble count for {overrideMarbleDialog.user?.username || `User ${overrideMarbleDialog.user?.user_id}`}
          </Typography>
          <TextField
            fullWidth
            label="New Count"
            type="number"
            value={overrideMarbleForm.count}
            onChange={(e) => setOverrideMarbleForm({ ...overrideMarbleForm, count: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{ inputProps: { min: 0 } }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason (Required)"
            value={overrideMarbleForm.reason}
            onChange={(e) => setOverrideMarbleForm({ ...overrideMarbleForm, reason: e.target.value })}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideMarbleDialog({ open: false, user: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              if (overrideMarbleForm.count === '' || overrideMarbleForm.count === null || !overrideMarbleForm.reason.trim()) {
                alert('Please enter count and reason.');
                return;
              }
              try {
                await axios.post(
                  `${getApiUrl()}/api/marbles/${overrideMarbleDialog.user.user_id}/override`,
                  {
                    count: parseInt(overrideMarbleForm.count),
                    reason: overrideMarbleForm.reason
                  },
                  {
                    headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' }
                  }
                );
                await fetchMarbles();
                setOverrideMarbleDialog({ open: false, user: null });
                setOverrideMarbleForm({ count: '', reason: '' });
              } catch (error) {
                console.error('Error overriding marbles:', error);
                alert('Failed to override marbles. Please check your PIN.');
              }
            }}
            disabled={overrideMarbleForm.count === '' || overrideMarbleForm.count === null || !overrideMarbleForm.reason.trim()}
          >
            Override
          </Button>
        </DialogActions>
      </Dialog>

      {/* Override Marble Dialog */}
      <Dialog
        open={overrideMarbleDialog.open}
        onClose={() => setOverrideMarbleDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Marble Override</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Overriding marble count for {overrideMarbleDialog.user?.username || `User ${overrideMarbleDialog.user?.user_id}`}
          </Typography>
          <TextField
            fullWidth
            label="New Count"
            type="number"
            value={overrideMarbleForm.count}
            onChange={(e) => setOverrideMarbleForm({ ...overrideMarbleForm, count: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{ inputProps: { min: 0 } }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason (Required)"
            value={overrideMarbleForm.reason}
            onChange={(e) => setOverrideMarbleForm({ ...overrideMarbleForm, reason: e.target.value })}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideMarbleDialog({ open: false, user: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              if (overrideMarbleForm.count === '' || overrideMarbleForm.count === null || !overrideMarbleForm.reason.trim()) {
                alert('Please enter count and reason.');
                return;
              }
              try {
                await axios.post(
                  `${getApiUrl()}/api/marbles/${overrideMarbleDialog.user.user_id}/override`,
                  {
                    count: parseInt(overrideMarbleForm.count),
                    reason: overrideMarbleForm.reason
                  },
                  {
                    headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' }
                  }
                );
                await fetchMarbles();
                setOverrideMarbleDialog({ open: false, user: null });
                setOverrideMarbleForm({ count: '', reason: '' });
              } catch (error) {
                console.error('Error overriding marbles:', error);
                alert('Failed to override marbles. Please check your PIN.');
              }
            }}
            disabled={overrideMarbleForm.count === '' || overrideMarbleForm.count === null || !overrideMarbleForm.reason.trim()}
          >
            Override
          </Button>
        </DialogActions>
      </Dialog>

      {/* Marble History Dialog */}
      <Dialog
        open={showMarbleHistoryDialog}
        onClose={() => setShowMarbleHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Marble History</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {marbleHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                    <TableCell>{entry.change_amount > 0 ? '+' : ''}{entry.change_amount}</TableCell>
                    <TableCell>{entry.change_type}</TableCell>
                    <TableCell>{entry.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMarbleHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Photo Source Dialog */}
      <Dialog
        open={showPhotoSourceDialog}
        onClose={() => setShowPhotoSourceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPhotoSource ? 'Edit Photo Source' : 'Add Photo Source'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Source Name"
            value={photoSourceForm.name}
            onChange={(e) => setPhotoSourceForm({ ...photoSourceForm, name: e.target.value })}
            margin="normal"
            sx={{ mt: 2 }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={photoSourceForm.type}
              onChange={(e) => setPhotoSourceForm({ ...photoSourceForm, type: e.target.value })}
              label="Type"
            >
              <MenuItem value="Immich">Immich</MenuItem>
              <MenuItem value="GooglePhotos">Google Photos (Coming Soon)</MenuItem>
            </Select>
          </FormControl>

          {photoSourceForm.type === 'Immich' && (
            <>
              <TextField
                fullWidth
                label="Immich Server URL"
                value={photoSourceForm.url}
                onChange={(e) => setPhotoSourceForm({ ...photoSourceForm, url: e.target.value })}
                margin="normal"
                placeholder="https://immich.example.com"
                helperText="Your Immich server URL"
              />
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={photoSourceForm.api_key}
                onChange={(e) => setPhotoSourceForm({ ...photoSourceForm, api_key: e.target.value })}
                margin="normal"
                helperText="Get from Immich Settings → API Keys"
              />
              <TextField
                fullWidth
                label="Album ID (Optional)"
                value={photoSourceForm.album_id}
                onChange={(e) => setPhotoSourceForm({ ...photoSourceForm, album_id: e.target.value })}
                margin="normal"
                helperText="Leave empty to show all photos"
              />
            </>
          )}

          {photoSourceForm.type === 'GooglePhotos' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Google Photos integration coming soon. Stay tuned!
            </Alert>
          )}

          {photoTestResult && (
            <Alert severity={photoTestResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
              {photoTestResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {editingPhotoSource && (
            <Button
              onClick={async () => {
                setTestingPhotoConnection(true);
                try {
                  const response = await axios.post(`${getApiUrl()}/api/photo-sources/${editingPhotoSource.id}/test`);
                  setPhotoTestResult({ success: true, message: response.data.message });
                } catch (error) {
                  setPhotoTestResult({ success: false, message: error.response?.data?.error || 'Connection failed' });
                } finally {
                  setTestingPhotoConnection(false);
                }
              }}
              disabled={testingPhotoConnection}
              startIcon={testingPhotoConnection ? <CircularProgress size={16} /> : <Refresh />}
            >
              Test Connection
            </Button>
          )}
          <Button onClick={() => setShowPhotoSourceDialog(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              setSavingPhotoSource(true);
              try {
                if (editingPhotoSource) {
                  await axios.patch(`${getApiUrl()}/api/photo-sources/${editingPhotoSource.id}`, photoSourceForm);
                } else {
                  await axios.post(`${getApiUrl()}/api/photo-sources`, photoSourceForm);
                }
                await fetchPhotoSources();
                setShowPhotoSourceDialog(false);
                setPhotoTestResult(null);
              } catch (error) {
                console.error('Error saving photo source:', error);
                alert('Failed to save photo source. Please try again.');
              } finally {
                setSavingPhotoSource(false);
              }
            }}
            variant="contained"
            disabled={savingPhotoSource || !photoSourceForm.name || !photoSourceForm.type}
            sx={{
              backgroundColor: 'var(--primary)',
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--primary)',
                opacity: 0.9
              }
            }}
          >
            {savingPhotoSource ? 'Saving...' : editingPhotoSource ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AdminPanel;
