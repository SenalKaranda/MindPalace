import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx'; // Corrected import path
import { loadThemeSettings, applyThemeSettings, getAllFonts, loadGoogleFont } from './utils/theme.js';
import { performanceMonitor } from './utils/performanceMonitor.js';
import './index.css';

// Apply theme synchronously before React renders to prevent FOUC (Flash of Unstyled Content)
console.log('[Main] Initializing theme before React render...');
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
console.log('[Main] Detected theme:', savedTheme);
document.documentElement.setAttribute('data-theme', savedTheme);
const themeSettings = loadThemeSettings();
applyThemeSettings(themeSettings, savedTheme);

// Load fonts asynchronously after initial render
getAllFonts().then(fonts => {
  if (themeSettings && themeSettings.typography) {
    const typography = themeSettings.typography;
    const fontsToLoad = [];
    
    // Get font objects for all three font families
    if (typography.primaryFont) {
      const font = fonts.find(f => f.fontFamily === typography.primaryFont || f.id === typography.primaryFont);
      if (font && font.googleFontsUrl) fontsToLoad.push(font);
    }
    if (typography.secondaryFont) {
      const font = fonts.find(f => f.fontFamily === typography.secondaryFont || f.id === typography.secondaryFont);
      if (font && font.googleFontsUrl) fontsToLoad.push(font);
    }
    if (typography.tertiaryFont) {
      const font = fonts.find(f => f.fontFamily === typography.tertiaryFont || f.id === typography.tertiaryFont);
      if (font && font.googleFontsUrl) fontsToLoad.push(font);
    }
    
    // Load all fonts
    fontsToLoad.forEach(font => loadGoogleFont(font));
  }
});

console.log('[Main] Theme initialization complete');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
