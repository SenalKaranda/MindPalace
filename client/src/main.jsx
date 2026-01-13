import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx'; // Corrected import path
import { loadThemeSettings, applyThemeSettings } from './utils/theme.js';
import './index.css';

// Apply theme synchronously before React renders to prevent FOUC (Flash of Unstyled Content)
console.log('[Main] Initializing theme before React render...');
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
console.log('[Main] Detected theme:', savedTheme);
document.documentElement.setAttribute('data-theme', savedTheme);
const themeSettings = loadThemeSettings();
applyThemeSettings(themeSettings, savedTheme);
console.log('[Main] Theme initialization complete');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
