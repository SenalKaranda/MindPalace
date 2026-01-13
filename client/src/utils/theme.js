// Theme utility functions for HomeGlow

/**
 * Default theme settings
 */
export const defaultThemeSettings = {
  colors: {
    light: {
      background: '#fafafa',
      surface: '#ffffff',
      cardBg: '#ffffff',
      text: '#000000',
      textSecondary: '#525252',
      border: '#e0e0e0',
      cardBorder: '#d4d4d4',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      primary: '#9E7FFF',
      secondary: '#38bdf8',
      accent: '#636363',
    },
    dark: {
      background: '#0f0f0f',
      surface: '#1a1a1a',
      cardBg: '#3a3a3a',
      text: '#ffffff',
      textSecondary: '#e5e5e5',
      border: '#2a2a2a',
      cardBorder: '#4a4a4a',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      primary: '#9E7FFF',
      secondary: '#38bdf8',
      accent: '#8a8a8a',
    },
    gradients: {
      lightGradientStart: '#00ddeb',
      lightGradientEnd: '#ff6b6b',
      darkGradientStart: '#2e2767',
      darkGradientEnd: '#620808',
      lightButtonGradientStart: '#00ddeb',
      lightButtonGradientEnd: '#ff6b6b',
      darkButtonGradientStart: '#2e2767',
      darkButtonGradientEnd: '#620808',
    }
  },
  typography: {
    fontFamily: 'Inter',
    baseFontSize: 16,
    lineHeight: 1.5,
    letterSpacing: -0.01,
    fontWeight: 400,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    widgetPadding: 16,
    widgetMargin: 24,
    containerPadding: 24,
  },
  borders: {
    radiusSmall: 8,
    radiusMedium: 12,
    radiusLarge: 16,
    radiusXLarge: 24,
    width: 1,
    style: 'solid',
  },
  shadows: {
    elevation1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    elevation2: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
    elevation3: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    color: 'rgba(0, 0, 0, 0.12)',
    opacity: 0.12,
  },
};

/**
 * Load theme settings from localStorage
 */
export const loadThemeSettings = () => {
  try {
    const saved = localStorage.getItem('themeSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all properties exist
      const merged = deepMerge(defaultThemeSettings, parsed);
      console.log('[Theme] Loaded theme settings from localStorage:', merged);
      return merged;
    }
  } catch (error) {
    console.error('[Theme] Error loading theme settings:', error);
  }
  console.log('[Theme] Using default theme settings');
  return defaultThemeSettings;
};

/**
 * Save theme settings to localStorage
 */
export const saveThemeSettings = (settings) => {
  try {
    localStorage.setItem('themeSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving theme settings:', error);
  }
};

/**
 * Convert hex color to RGB string (e.g., "#ff0000" -> "255, 0, 0")
 * @param {string} hex - Hex color string
 * @returns {string} RGB string
 */
const hexToRgb = (hex) => {
  if (!hex) return '0, 0, 0';
  // Remove # if present
  hex = hex.replace('#', '');
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

/**
 * Apply theme settings to CSS variables
 * @param {Object} settings - Theme settings object
 * @param {string} currentTheme - Current theme ('light' or 'dark')
 * @param {boolean} isPreview - If true, uses actual document theme instead of currentTheme parameter
 */
export const applyThemeSettings = (settings, currentTheme = 'light', isPreview = false) => {
  const root = document.documentElement;
  
  // If this is a preview, use the actual current theme from the document
  // Otherwise, use the provided currentTheme parameter
  const themeToUse = isPreview 
    ? (document.documentElement.getAttribute('data-theme') || 'light')
    : currentTheme;
  
  console.log(`[Theme] Applying theme: ${themeToUse} (isPreview: ${isPreview})`);
  
  // Ensure settings has the correct structure
  if (!settings || !settings.colors || !settings.colors[themeToUse]) {
    console.warn('[Theme] Invalid theme settings structure, using defaults');
    settings = defaultThemeSettings;
  }
  
  const themeColors = settings.colors[themeToUse] || settings.colors.light;
  const gradients = settings.colors.gradients || defaultThemeSettings.colors.gradients;
  
  console.log(`[Theme] Theme colors for ${themeToUse}:`, themeColors);

  // Apply color variables (convert camelCase to kebab-case) and generate RGB versions
  Object.entries(themeColors).forEach(([key, value]) => {
    // Handle special cases
    const cssKeyMap = {
      'cardBg': 'card-bg',
      'textSecondary': 'text-secondary',
      'cardBorder': 'card-border'
    };
    const cssKey = cssKeyMap[key] || key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssKey}`, value);
    
    // Generate RGB variable for colors that might need rgba() support
    if (value && typeof value === 'string' && value.startsWith('#')) {
      const rgbValue = hexToRgb(value);
      root.style.setProperty(`--${cssKey}-rgb`, rgbValue);
    }
  });

  // Apply gradient variables
  root.style.setProperty('--light-gradient-start', gradients.lightGradientStart);
  root.style.setProperty('--light-gradient-end', gradients.lightGradientEnd);
  root.style.setProperty('--dark-gradient-start', gradients.darkGradientStart);
  root.style.setProperty('--dark-gradient-end', gradients.darkGradientEnd);
  root.style.setProperty('--light-button-gradient-start', gradients.lightButtonGradientStart);
  root.style.setProperty('--light-button-gradient-end', gradients.lightButtonGradientEnd);
  root.style.setProperty('--dark-button-gradient-start', gradients.darkButtonGradientStart);
  root.style.setProperty('--dark-button-gradient-end', gradients.darkButtonGradientEnd);

  // Apply typography variables
  root.style.setProperty('--font-family', settings.typography.fontFamily);
  root.style.setProperty('--base-font-size', `${settings.typography.baseFontSize}px`);
  root.style.setProperty('--line-height', settings.typography.lineHeight);
  root.style.setProperty('--letter-spacing', `${settings.typography.letterSpacing}em`);
  root.style.setProperty('--font-weight', settings.typography.fontWeight);

  // Apply spacing variables
  Object.entries(settings.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, `${value}px`);
  });

  // Apply border variables
  root.style.setProperty('--border-radius-small', `${settings.borders.radiusSmall}px`);
  root.style.setProperty('--border-radius-medium', `${settings.borders.radiusMedium}px`);
  root.style.setProperty('--border-radius-large', `${settings.borders.radiusLarge}px`);
  root.style.setProperty('--border-radius-xlarge', `${settings.borders.radiusXLarge}px`);
  root.style.setProperty('--border-width', `${settings.borders.width}px`);
  root.style.setProperty('--border-style', settings.borders.style);

  // Apply shadow variables
  root.style.setProperty('--elevation-1', settings.shadows.elevation1);
  root.style.setProperty('--elevation-2', settings.shadows.elevation2);
  root.style.setProperty('--elevation-3', settings.shadows.elevation3);
  
  // Set theme-aware gradient variables based on current theme
  if (themeToUse === 'dark') {
    root.style.setProperty('--gradient-start', gradients.darkGradientStart);
    root.style.setProperty('--gradient-end', gradients.darkGradientEnd);
  } else {
    root.style.setProperty('--gradient-start', gradients.lightGradientStart);
    root.style.setProperty('--gradient-end', gradients.lightGradientEnd);
  }
  
  // Calculate and apply derived variables
  const backgroundRgb = hexToRgb(themeColors.background);
  const cardBgRgb = hexToRgb(themeColors.cardBg);
  const textRgb = hexToRgb(themeColors.text);
  
  // Set gradient
  root.style.setProperty('--gradient', `linear-gradient(135deg, ${themeColors.background} 0%, ${themeColors.surface} 100%)`);
  
  // Set bottom bar background with transparency
  const bottomBarRgb = hexToRgb(themeColors.surface || themeColors.cardBg);
  root.style.setProperty('--bottom-bar-bg', `rgba(${bottomBarRgb}, 0.95)`);
  
  // Validate that all required RGB variables are set
  const requiredRgbVars = ['primary', 'secondary', 'accent', 'background', 'surface', 'card-bg', 'text', 'text-secondary', 'border', 'card-border', 'success', 'warning', 'error'];
  const missingRgbVars = [];
  requiredRgbVars.forEach(varName => {
    const rgbValue = root.style.getPropertyValue(`--${varName}-rgb`);
    if (!rgbValue || rgbValue.trim() === '') {
      missingRgbVars.push(`--${varName}-rgb`);
    }
  });
  
  if (missingRgbVars.length > 0) {
    console.warn('[Theme] Missing RGB variables:', missingRgbVars);
  }
  
  // Debug: Verify key variables were set
  const verifyText = root.style.getPropertyValue('--text');
  const verifyBackground = root.style.getPropertyValue('--background');
  const verifyCardBg = root.style.getPropertyValue('--card-bg');
  console.log('[Theme] Applied CSS variables - text:', verifyText, 'background:', verifyBackground, 'card-bg:', verifyCardBg);
};

/**
 * Deep merge two objects
 */
const deepMerge = (target, source) => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Theme presets
 */
export const themePresets = {
  default: {
    name: 'Default',
    settings: defaultThemeSettings,
  },
  ocean: {
    name: 'Ocean',
    settings: {
      ...defaultThemeSettings,
      colors: {
        ...defaultThemeSettings.colors,
        light: {
          ...defaultThemeSettings.colors.light,
          primary: '#0284c7',
          secondary: '#06b6d4',
          accent: '#0891b2',
          background: '#f0f9ff',
          surface: '#ffffff',
          cardBg: '#ffffff',
          text: '#1a1a1a',
          textSecondary: '#6b6b6b',
          border: '#bfdbfe',
          cardBorder: '#93c5fd',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#38bdf8',
          secondary: '#06b6d4',
          accent: '#22d3ee',
          background: '#0f172a',
          surface: '#1e293b',
          cardBg: '#475569',
          text: '#ffffff',
          textSecondary: '#e2e8f0',
          border: '#1e293b',
          cardBorder: '#64748b',
        },
      },
    },
  },
  forest: {
    name: 'Forest',
    settings: {
      ...defaultThemeSettings,
      colors: {
        ...defaultThemeSettings.colors,
        light: {
          ...defaultThemeSettings.colors.light,
          primary: '#15803d',
          secondary: '#22c55e',
          accent: '#65a30d',
          background: '#f0fdf4',
          surface: '#ffffff',
          cardBg: '#ffffff',
          text: '#1a1a1a',
          textSecondary: '#6b6b6b',
          border: '#bbf7d0',
          cardBorder: '#86efac',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#4ade80',
          secondary: '#22c55e',
          accent: '#84cc16',
          background: '#0f1f14',
          surface: '#1a2e1f',
          cardBg: '#2d4a3a',
          text: '#ffffff',
          textSecondary: '#d1fae5',
          border: '#1a2e1f',
          cardBorder: '#3d5a4a',
        },
      },
    },
  },
  sunset: {
    name: 'Sunset',
    settings: {
      ...defaultThemeSettings,
      colors: {
        ...defaultThemeSettings.colors,
        light: {
          ...defaultThemeSettings.colors.light,
          primary: '#ea580c',
          secondary: '#f97316',
          accent: '#dc2626',
          background: '#fff7ed',
          surface: '#ffffff',
          cardBg: '#ffffff',
          text: '#1a1a1a',
          textSecondary: '#6b6b6b',
          border: '#fed7aa',
          cardBorder: '#fdba74',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#fb923c',
          secondary: '#f97316',
          accent: '#f87171',
          background: '#1c1917',
          surface: '#292524',
          cardBg: '#3a3530',
          text: '#ffffff',
          textSecondary: '#fef3c7',
          border: '#292524',
          cardBorder: '#4a4438',
        },
      },
    },
  },
  midnight: {
    name: 'Midnight',
    settings: {
      ...defaultThemeSettings,
      colors: {
        ...defaultThemeSettings.colors,
        light: {
          ...defaultThemeSettings.colors.light,
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#9333ea',
          background: '#f5f3ff',
          surface: '#ffffff',
          cardBg: '#ffffff',
          text: '#1a1a1a',
          textSecondary: '#6b6b6b',
          border: '#e9d5ff',
          cardBorder: '#d8b4fe',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#818cf8',
          secondary: '#a78bfa',
          accent: '#c084fc',
          background: '#0f0f1e',
          surface: '#1a1a2e',
          cardBg: '#2d2a4e',
          text: '#ffffff',
          textSecondary: '#e9d5ff',
          border: '#1a1a2e',
          cardBorder: '#3d3a5e',
        },
      },
    },
  },
  minimal: {
    name: 'Minimal',
    settings: {
      ...defaultThemeSettings,
      colors: {
        ...defaultThemeSettings.colors,
        light: {
          ...defaultThemeSettings.colors.light,
          primary: '#525252',
          secondary: '#737373',
          accent: '#a3a3a3',
          background: '#ffffff',
          surface: '#fafafa',
          cardBg: '#ffffff',
          text: '#000000',
          textSecondary: '#525252',
          border: '#e5e5e5',
          cardBorder: '#d4d4d4',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#a3a3a3',
          secondary: '#d4d4d4',
          accent: '#e5e5e5',
          background: '#0a0a0a',
          surface: '#141414',
          cardBg: '#2a2a2a',
          text: '#ffffff',
          textSecondary: '#e5e5e5',
          border: '#262626',
          cardBorder: '#404040',
        },
      },
    },
  },
  vibrant: {
    name: 'Vibrant',
    settings: {
      ...defaultThemeSettings,
      colors: {
        ...defaultThemeSettings.colors,
        light: {
          ...defaultThemeSettings.colors.light,
          primary: '#db2777',
          secondary: '#f59e0b',
          accent: '#10b981',
          background: '#fef3c7',
          surface: '#ffffff',
          cardBg: '#ffffff',
          text: '#1a1a1a',
          textSecondary: '#6b6b6b',
          border: '#fde68a',
          cardBorder: '#fcd34d',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#f472b6',
          secondary: '#fbbf24',
          accent: '#34d399',
          background: '#1a1814',
          surface: '#252320',
          cardBg: '#3a3630',
          text: '#ffffff',
          textSecondary: '#fef3c7',
          border: '#252320',
          cardBorder: '#4a4438',
        },
      },
    },
  },
};

/**
 * Export theme settings as JSON
 */
export const exportThemeSettings = (settings) => {
  const dataStr = JSON.stringify(settings, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `homeglow-theme-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import theme settings from JSON file
 */
export const importThemeSettings = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        resolve(settings);
      } catch (error) {
        reject(new Error('Invalid theme file format'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};
