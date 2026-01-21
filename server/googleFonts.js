// Google Fonts API fetcher and cache module for the main app server
const https = require('https');

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let fontCache = null;
let cacheTimestamp = null;

/**
 * Normalize Google Fonts API response to our font format
 * Matches structure expected in server/themes/fonts/*.json and client/src/utils/theme.js
 * @param {Object} googleFont - Font object from Google Fonts API
 * @returns {Object} Normalized font object
 */
function normalizeGoogleFont(googleFont) {
  const fontName = googleFont.family;

  // Generate ID from font name (lowercase, replace spaces with hyphens)
  const id = fontName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Build fontFamily string with sensible fallbacks
  const fontFamily = `"${fontName}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif`;

  // Extract available (non-italic) weights
  const weights = (googleFont.variants || [])
    .filter((v) => !v.includes('italic'))
    .map((v) => parseInt(v, 10) || 400)
    .filter((w) => !Number.isNaN(w))
    .sort((a, b) => a - b);

  const defaultWeights = weights.length > 0 ? weights : [400];

  // Build Google Fonts URL (wght axis)
  const weightList =
    defaultWeights.length >= 4
      ? defaultWeights.slice(0, 4).join(';')
      : defaultWeights.join(';');

  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    fontName
  )}:wght@${weightList}&display=swap`;

  const category = googleFont.category || 'sans-serif';

  return {
    id,
    name: fontName,
    fontFamily,
    fontWeight: 400,
    fontStyle: 'normal',
    fontVariationSettings: null,
    googleFontsUrl,
    category,
    variants: googleFont.variants || [],
    defaultWeights,
    subsets: googleFont.subsets || []
  };
}

/**
 * Fetch fonts from Google Fonts Developer API
 * @param {string} apiKey - Google Fonts API key
 * @param {Object} options - Query options (sort, category)
 * @returns {Promise<Array>} Array of normalized font objects
 */
async function fetchGoogleFonts(apiKey, options = {}) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('Google Fonts API key is required'));
      return;
    }

    const { sort = 'popularity', category } = options;
    let url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${encodeURIComponent(
      apiKey
    )}&sort=${sort}`;

    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }

    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (response.error) {
              reject(
                new Error(
                  `Google Fonts API error: ${
                    response.error.message || JSON.stringify(response.error)
                  }`
                )
              );
              return;
            }

            if (!response.items || !Array.isArray(response.items)) {
              reject(
                new Error(
                  'Invalid response from Google Fonts API: missing items array'
                )
              );
              return;
            }

            const normalizedFonts = response.items.map(normalizeGoogleFont);
            resolve(normalizedFonts);
          } catch (error) {
            reject(
              new Error(
                `Failed to parse Google Fonts API response: ${error.message}`
              )
            );
          }
        });
      })
      .on('error', (error) => {
        reject(
          new Error(`Failed to fetch from Google Fonts API: ${error.message}`)
        );
      });
  });
}

/**
 * Get fonts from Google Fonts API with caching
 * @param {string} apiKey - Google Fonts API key
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of normalized font objects
 */
async function getGoogleFonts(apiKey, options = {}) {
  const now = Date.now();
  if (fontCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return fontCache;
  }

  try {
    const fonts = await fetchGoogleFonts(apiKey, options);
    fontCache = fonts;
    cacheTimestamp = now;
    return fonts;
  } catch (error) {
    if (fontCache) {
      console.warn(
        '[Google Fonts - main] Fetch failed, using cached fonts:',
        error.message
      );
      return fontCache;
    }
    throw error;
  }
}

function clearCache() {
  fontCache = null;
  cacheTimestamp = null;
}

module.exports = {
  getGoogleFonts,
  fetchGoogleFonts,
  normalizeGoogleFont,
  clearCache
};

