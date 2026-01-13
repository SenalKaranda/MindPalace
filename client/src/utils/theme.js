// Theme utility functions for HomeGlow

/**
 * Default theme settings
 */
export const defaultThemeSettings = {
  colors: {
    light: {
      background: '#f5f5f5',
      surface: '#ffffff',
      cardBg: '#ffffff',
      text: '#171717',
      textSecondary: '#666666',
      border: '#e0e0e0',
      cardBorder: '#e5e5e5',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      primary: '#9E7FFF',
      secondary: '#38bdf8',
      accent: '#757575',
    },
    dark: {
      background: '#171717',
      surface: '#262626',
      cardBg: '#2a2a2a',
      text: '#FFFFFF',
      textSecondary: '#A3A3A3',
      border: '#2F2F2F',
      cardBorder: '#3a3a3a',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      primary: '#9E7FFF',
      secondary: '#38bdf8',
      accent: '#757575',
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
      return deepMerge(defaultThemeSettings, parsed);
    }
  } catch (error) {
    console.error('Error loading theme settings:', error);
  }
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
  
  const themeColors = settings.colors[themeToUse] || settings.colors.light;
  const gradients = settings.colors.gradients || defaultThemeSettings.colors.gradients;

  // Apply color variables (convert camelCase to kebab-case)
  Object.entries(themeColors).forEach(([key, value]) => {
    // Handle special cases
    const cssKeyMap = {
      'cardBg': 'card-bg',
      'textSecondary': 'text-secondary',
      'cardBorder': 'card-border'
    };
    const cssKey = cssKeyMap[key] || key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssKey}`, value);
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
          primary: '#0ea5e9',
          secondary: '#06b6d4',
          accent: '#14b8a6',
          background: '#f0f9ff',
          surface: '#ffffff',
          cardBg: '#ffffff',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#0ea5e9',
          secondary: '#06b6d4',
          accent: '#14b8a6',
          background: '#0c4a6e',
          surface: '#075985',
          cardBg: '#0e7490',
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
          primary: '#16a34a',
          secondary: '#22c55e',
          accent: '#84cc16',
          background: '#f0fdf4',
          surface: '#ffffff',
          cardBg: '#ffffff',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#16a34a',
          secondary: '#22c55e',
          accent: '#84cc16',
          background: '#14532d',
          surface: '#166534',
          cardBg: '#15803d',
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
          primary: '#f97316',
          secondary: '#fb923c',
          accent: '#f43f5e',
          background: '#fff7ed',
          surface: '#ffffff',
          cardBg: '#ffffff',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#f97316',
          secondary: '#fb923c',
          accent: '#f43f5e',
          background: '#7c2d12',
          surface: '#9a3412',
          cardBg: '#c2410c',
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
          accent: '#a855f7',
          background: '#f5f3ff',
          surface: '#ffffff',
          cardBg: '#ffffff',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#a855f7',
          background: '#1e1b4b',
          surface: '#312e81',
          cardBg: '#4338ca',
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
          primary: '#6b7280',
          secondary: '#9ca3af',
          accent: '#d1d5db',
          background: '#ffffff',
          surface: '#f9fafb',
          cardBg: '#ffffff',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#6b7280',
          secondary: '#9ca3af',
          accent: '#d1d5db',
          background: '#111827',
          surface: '#1f2937',
          cardBg: '#374151',
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
          primary: '#ec4899',
          secondary: '#f59e0b',
          accent: '#10b981',
          background: '#fef3c7',
          surface: '#ffffff',
          cardBg: '#ffffff',
        },
        dark: {
          ...defaultThemeSettings.colors.dark,
          primary: '#ec4899',
          secondary: '#f59e0b',
          accent: '#10b981',
          background: '#451a03',
          surface: '#78350f',
          cardBg: '#92400e',
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
