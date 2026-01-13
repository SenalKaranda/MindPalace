import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Box, IconButton, CircularProgress, Alert, Chip, Card } from '@mui/material';
import { Refresh, ChevronLeft, ChevronRight, PlayArrow, Pause } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';

const PhotoWidget = ({ transparentBackground }) => {
  const [photos, setPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());
  const [retryCounts, setRetryCounts] = useState(new Map());
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [photoSources, setPhotoSources] = useState([]);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [sourceForm, setSourceForm] = useState({
    name: '',
    type: 'Immich',
    url: '',
    api_key: '',
    album_id: '',
    refresh_token: ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savingSource, setSavingSource] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(5000);
  const [maxPhotosPerView, setMaxPhotosPerView] = useState(3);
  const [transitionType, setTransitionType] = useState('none');
  const [showPhotoCount, setShowPhotoCount] = useState(true);
  const [imageDimensions, setImageDimensions] = useState(new Map()); // Track image dimensions
  const [preloadedImages, setPreloadedImages] = useState(new Set()); // Track preloaded images
  const [shownImageIds, setShownImageIds] = useState(new Set()); // Track which images have been shown

  useEffect(() => {
    fetchPhotoSources();
    fetchPhotos();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings`);
      const settings = response.data;

      if (settings.PHOTO_WIDGET_MAX_PHOTOS_PER_VIEW) {
        setMaxPhotosPerView(parseInt(settings.PHOTO_WIDGET_MAX_PHOTOS_PER_VIEW));
      }
      if (settings.PHOTO_WIDGET_TRANSITION_TYPE) {
        setTransitionType(settings.PHOTO_WIDGET_TRANSITION_TYPE);
      }
      if (settings.PHOTO_WIDGET_SLIDESHOW_INTERVAL) {
        setSlideshowInterval(parseInt(settings.PHOTO_WIDGET_SLIDESHOW_INTERVAL));
      }
      if (settings.PHOTO_WIDGET_SHOW_PHOTO_COUNT !== undefined) {
        setShowPhotoCount(settings.PHOTO_WIDGET_SHOW_PHOTO_COUNT !== 'false');
      }
    } catch (error) {
      console.error('Error loading photo widget preferences:', error);
    }
  };

  const savePreference = async (key, value) => {
    try {
      await axios.post(`${getApiUrl()}/api/settings`, {
        key,
        value: value.toString()
      });
    } catch (error) {
      console.error('Error saving photo widget preference:', error);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.photo?.refreshInterval || 0;

    if (refreshInterval > 0) {
      console.log(`PhotoWidget: Auto-refresh enabled (${refreshInterval}ms)`);
      
      const intervalId = setInterval(() => {
        console.log('PhotoWidget: Auto-refreshing data...');
        fetchPhotos();
      }, refreshInterval);

      return () => {
        console.log('PhotoWidget: Clearing auto-refresh interval');
        clearInterval(intervalId);
      };
    }
  }, []);

  // Detect image orientation
  const getImageOrientation = (width, height) => {
    if (!width || !height) return null;
    return width > height ? 'landscape' : 'portrait';
  };

  // Get photos grouped by orientation, ensuring no duplicates in a set
  // Returns up to maxPhotosPerView photos with matching orientation
  // Only returns photos that haven't been shown yet
  const getCurrentPhotos = (startIndex = null, forceRemainder = false) => {
    const indexToUse = startIndex !== null ? startIndex : currentPhotoIndex;
    
    if (photos.length === 0) return { photos: [], orientation: null, lastSearchedIndex: indexToUse };
    
    // Check if all images have been shown
    const allShown = shownImageIds.size >= photos.length && photos.length > 0;
    if (allShown && !forceRemainder) {
      console.log(`[PhotoWidget] All images shown (${shownImageIds.size}/${photos.length}), will reset on next navigation`);
      return { photos: [], orientation: null, lastSearchedIndex: 0, allShown: true };
    }
    
    const usedIndices = new Set();
    const result = [];
    let currentOrientation = null;
    let lastSearchedIndex = indexToUse;
    
    // Start from current index and find photos with matching orientation that haven't been shown
    let searchIndex = indexToUse;
    let attempts = 0;
    const maxAttempts = photos.length * 2;
    let foundAnyWithDimensions = false;
    let unshownPhotos = []; // Track unshown photos for remainder handling
    
    // First pass: Try to find photos with matching orientation
    while (result.length < maxPhotosPerView && attempts < maxAttempts) {
      const index = searchIndex % photos.length;
      lastSearchedIndex = index;
      
      if (!usedIndices.has(index)) {
        const photo = photos[index];
        const imageKey = `${photo.id}`;
        
        // Skip if already shown (unless we're forcing remainder)
        if (shownImageIds.has(imageKey) && !forceRemainder) {
          searchIndex++;
          attempts++;
          continue;
        }
        
        const dimensions = imageDimensions.get(imageKey);
        
        if (dimensions) {
          foundAnyWithDimensions = true;
          const orientation = getImageOrientation(dimensions.width, dimensions.height);
          
          if (result.length === 0) {
            currentOrientation = orientation;
            result.push({ photo, index });
            usedIndices.add(index);
          } else if (orientation === currentOrientation) {
            result.push({ photo, index });
            usedIndices.add(index);
          } else {
            // Different orientation - save for remainder handling
            unshownPhotos.push({ photo, index, orientation });
          }
        } else if (!foundAnyWithDimensions) {
          // If no photos have dimensions loaded yet, add photos without orientation matching
          result.push({ photo, index });
          usedIndices.add(index);
        } else {
          // Has dimensions but different orientation - save for remainder
          unshownPhotos.push({ photo, index, orientation: null });
        }
      }
      
      searchIndex++;
      attempts++;
    }
    
    // If we didn't find enough photos with matching orientation, handle remainder
    if (result.length < maxPhotosPerView && result.length > 0 && !forceRemainder) {
      // Try to fill with unshown photos (force them in, ignoring orientation)
      const needed = maxPhotosPerView - result.length;
      for (let i = 0; i < Math.min(needed, unshownPhotos.length); i++) {
        const { photo, index } = unshownPhotos[i];
        if (!usedIndices.has(index) && !shownImageIds.has(photo.id)) {
          result.push({ photo, index });
          usedIndices.add(index);
        }
      }
    }
    
    // If still no photos found and we have unshown photos, show them anyway (last resort)
    if (result.length === 0 && unshownPhotos.length > 0 && !forceRemainder) {
      const needed = Math.min(maxPhotosPerView, unshownPhotos.length);
      for (let i = 0; i < needed; i++) {
        const { photo, index } = unshownPhotos[i];
        if (!shownImageIds.has(photo.id)) {
          result.push({ photo, index });
          usedIndices.add(index);
        }
      }
    }
    
    // If still no photos, search for any unshown photos
    if (result.length === 0 && !forceRemainder) {
      searchIndex = indexToUse;
      attempts = 0;
      while (result.length < maxPhotosPerView && attempts < photos.length) {
        const index = searchIndex % photos.length;
        const photo = photos[index];
        const imageKey = `${photo.id}`;
        
        if (!shownImageIds.has(imageKey) && !usedIndices.has(index)) {
          result.push({ photo, index });
          usedIndices.add(index);
          lastSearchedIndex = index;
        }
        
        searchIndex++;
        attempts++;
      }
    }
    
    // Don't mark photos as shown here - do it in the navigation handlers to avoid re-render loops
    
    console.log(`[PhotoWidget] getCurrentPhotos(startIndex=${indexToUse}): Found ${result.length} photos, shown: ${shownImageIds.size}/${photos.length}, lastSearchedIndex=${lastSearchedIndex}`);
    return { photos: result, orientation: currentOrientation, lastSearchedIndex };
  };

  // Preload upcoming images
  useEffect(() => {
    if (photos.length === 0) return;
    
    // Use a ref to avoid calling getCurrentPhotos during render
    const currentPhotosResult = getCurrentPhotos(currentPhotoIndex);
    const { photos: currentPhotosData, lastSearchedIndex } = currentPhotosResult;
    if (currentPhotosData.length === 0) return;
    
    // Preload next set of photos starting from where current set ended
    const preloadCount = 5; // Preload next 5 photos
    const preloadPromises = [];
    
    let searchIndex = (lastSearchedIndex + 1) % photos.length;
    const usedIds = new Set(currentPhotosData.map(p => p.photo.id));
    let found = 0;
    let attempts = 0;
    
    while (found < preloadCount && attempts < photos.length) {
      const index = searchIndex % photos.length;
      const photo = photos[index];
      
      if (!usedIds.has(photo.id) && !preloadedImages.has(photo.id)) {
        const imageUrl = `${getApiUrl()}${photo.url}`;
        const img = new Image();
        
        const preloadPromise = new Promise((resolve) => {
          img.onload = () => {
            setPreloadedImages(prev => new Set([...prev, photo.id]));
            resolve();
          };
          img.onerror = () => resolve(); // Ignore errors
        });
        
        img.src = imageUrl;
        preloadPromises.push(preloadPromise);
        usedIds.add(photo.id);
        found++;
      }
      
      searchIndex++;
      attempts++;
    }
    
    // Don't await - let it preload in background
  }, [currentPhotoIndex, photos, preloadedImages]);
  
  // Slideshow timer
  useEffect(() => {
    if (!isPlaying || photos.length === 0) {
      console.log(`[PhotoWidget] Slideshow timer: isPlaying=${isPlaying}, photos.length=${photos.length}`);
      return;
    }

    console.log(`[PhotoWidget] Starting slideshow timer with interval ${slideshowInterval}ms`);
    const timer = setInterval(() => {
      // Check if all shown - reset first
      if (shownImageIds.size >= photos.length && photos.length > 0) {
        console.log(`[PhotoWidget] Slideshow: All shown, resetting and shuffling`);
        setShownImageIds(new Set());
        const shuffled = [...photos].sort(() => Math.random() - 0.5);
        setPhotos(shuffled);
        setCurrentPhotoIndex(0);
        return;
      }
      
      setCurrentPhotoIndex((prev) => {
        // Use getCurrentPhotos with the current prev value
        const { photos: currentPhotosData } = getCurrentPhotos(prev);
        
        // Mark current photos as shown
        if (currentPhotosData.length > 0) {
          const newShownIds = new Set(shownImageIds);
          currentPhotosData.forEach(({ photo }) => {
            newShownIds.add(photo.id);
          });
          setShownImageIds(newShownIds);
        }
        
        if (currentPhotosData.length === 0) {
          // If no photos found, search for next unshown photo
          let searchIndex = (prev + 1) % photos.length;
          let attempts = 0;
          while (attempts < photos.length) {
            const photo = photos[searchIndex];
            if (!shownImageIds.has(photo.id)) {
              console.log(`[PhotoWidget] Slideshow: Found unshown photo at index ${searchIndex}`);
              return searchIndex;
            }
            searchIndex = (searchIndex + 1) % photos.length;
            attempts++;
          }
          // All shown, reset (will be handled on next interval)
          return prev;
        }
        
        // Use the last photo's index from the current set
        const lastPhotoIndex = currentPhotosData[currentPhotosData.length - 1].index;
        let nextIndex = (lastPhotoIndex + 1) % photos.length;
        
        // Find next unshown photo
        let attempts = 0;
        while (shownImageIds.has(photos[nextIndex].id) && attempts < photos.length) {
          nextIndex = (nextIndex + 1) % photos.length;
          attempts++;
        }
        
        console.log(`[PhotoWidget] Slideshow: Advancing from ${prev} (last photo index: ${lastPhotoIndex}) to ${nextIndex}`);
        return nextIndex;
      });
    }, slideshowInterval);

    return () => {
      console.log(`[PhotoWidget] Clearing slideshow timer`);
      clearInterval(timer);
    };
  }, [isPlaying, photos, slideshowInterval, maxPhotosPerView, imageDimensions]);

  const fetchPhotoSources = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/photo-sources`);
      // Ensure response.data is an array before setting
      if (Array.isArray(response.data)) {
        setPhotoSources(response.data);
      } else {
        console.error('Invalid photo sources response:', response.data);
        setPhotoSources([]);
      }
    } catch (error) {
      console.error('Error fetching photo sources:', error);
      setPhotoSources([]);
    }
  };

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${getApiUrl()}/api/photo-items`);

      if (Array.isArray(response.data)) {
        setPhotos(response.data);
        setCurrentPhotoIndex(0);
        setShownImageIds(new Set()); // Reset shown images when fetching new photos
      } else {
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      setError('Failed to load photos. Please configure photo sources in settings.');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  // Photo sources and settings are now managed in Admin Panel

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) => {
      // Calculate previous set by working backwards
      let searchIndex = prev - 1;
      const usedIndices = new Set();
      const result = [];
      let currentOrientation = null;
      let attempts = 0;
      const maxAttempts = photos.length * 2;
      
      // Find the previous set of photos with matching orientation
      while (result.length < maxPhotosPerView && attempts < maxAttempts) {
        const index = (searchIndex + photos.length) % photos.length;
        
        if (!usedIndices.has(index)) {
          const photo = photos[index];
          const imageKey = `${photo.id}`;
          const dimensions = imageDimensions.get(imageKey);
          
          if (dimensions) {
            const orientation = getImageOrientation(dimensions.width, dimensions.height);
            
            if (result.length === 0) {
              currentOrientation = orientation;
              result.push({ photo, index });
              usedIndices.add(index);
            } else if (orientation === currentOrientation) {
              result.push({ photo, index });
              usedIndices.add(index);
            }
          } else if (result.length === 0) {
            result.push({ photo, index });
            usedIndices.add(index);
          }
        }
        
        searchIndex--;
        attempts++;
      }
      
      // Return the first index of the previous set
      if (result.length > 0) {
        return result[result.length - 1].index;
      }
      return (prev - 1 + photos.length) % photos.length;
    });
  };

  const handleNextPhoto = () => {
    console.log(`[PhotoWidget] handleNextPhoto called, currentPhotoIndex=${currentPhotoIndex}, photos.length=${photos.length}`);
    setCurrentPhotoIndex((prev) => {
      console.log(`[PhotoWidget] handleNextPhoto: prev=${prev}`);
      // Get current photos to know where we are, then advance past them
      const { photos: currentPhotosData } = getCurrentPhotos(prev);
      console.log(`[PhotoWidget] handleNextPhoto: Found ${currentPhotosData.length} photos`);
      
      if (currentPhotosData.length === 0) {
        // If no photos found, just advance by 1
        const nextIndex = (prev + 1) % photos.length;
        console.log(`[PhotoWidget] handleNextPhoto: No photos found, advancing from ${prev} to ${nextIndex}`);
        return nextIndex;
      }
      
      // Use the last photo's index from the current set
      // This ensures we advance past the photos we're actually displaying
      const lastPhotoIndex = currentPhotosData[currentPhotosData.length - 1].index;
      let nextIndex = (lastPhotoIndex + 1) % photos.length;
      
      // If we wrapped around and nextIndex equals prev, advance by the number of photos we found
      // This prevents getting stuck when the last photo index wraps back to the start
      if (nextIndex === prev && currentPhotosData.length > 0) {
        nextIndex = (prev + currentPhotosData.length) % photos.length;
        console.log(`[PhotoWidget] handleNextPhoto: Wrapped around, advancing by ${currentPhotosData.length} from ${prev} to ${nextIndex}`);
      } else {
        console.log(`[PhotoWidget] handleNextPhoto: Advancing from ${prev} (last photo index: ${lastPhotoIndex}) to ${nextIndex}`);
      }
      
      return nextIndex;
    });
  };

  const handleTogglePlayback = () => {
    setIsPlaying((prev) => !prev);
  };

  // Memoize current photos to prevent infinite re-renders
  const currentPhotosResult = useMemo(() => {
    return getCurrentPhotos();
  }, [currentPhotoIndex, photos, shownImageIds, imageDimensions, maxPhotosPerView]);
  
  const { photos: currentPhotosData, orientation: currentOrientation } = currentPhotosResult;
  
  // Handle image load to get dimensions
  const handleImageLoad = (event, photo) => {
    const img = event.target;
    const imageKey = `${photo.id}`;
    setImageDimensions(prev => {
      const newMap = new Map(prev);
      newMap.set(imageKey, { width: img.naturalWidth, height: img.naturalHeight });
      return newMap;
    });
  };

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
            📷 Photos
          </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <IconButton
            onClick={handleNextPhoto}
            size="small"
            disabled={loading || photos.length === 0}
            sx={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              boxShadow: 'var(--elevation-1)',
              border: '1px solid var(--card-border)',
              '&:hover': { 
                backgroundColor: 'var(--primary)',
                color: 'var(--text)',
                transform: 'scale(1.05)',
                boxShadow: 'var(--elevation-2)'
              },
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronRight />
          </IconButton>
          <IconButton 
            onClick={handleTogglePlayback} 
            size="small"
            color={isPlaying ? "primary" : "default"}
            sx={{
              backgroundColor: isPlaying ? 'rgba(var(--primary-rgb), 0.12)' : 'rgba(var(--primary-rgb), 0.12)',
              color: isPlaying ? 'var(--primary)' : 'var(--text-secondary)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: '20px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                color: 'var(--primary)',
                transform: 'scale(1.05)',
                boxShadow: 'var(--elevation-2)'
              }
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton 
            onClick={fetchPhotos} 
            size="small" 
            disabled={loading}
            sx={{
              backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: '20px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                color: 'var(--primary)',
                transform: 'scale(1.05)',
                boxShadow: 'var(--elevation-2)'
              },
              '&:disabled': {
                opacity: 0.5
              }
            }}
          >
            <Refresh />
          </IconButton>
        </Box>
      </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', p: 2, display: 'flex', flexDirection: 'column' }}>
      {loading && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          flex: 1,
          minHeight: 300
        }}>
          <CircularProgress sx={{ color: 'var(--primary)' }} />
        </Box>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 'var(--spacing-2)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--error)'
          }}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && photos.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 'var(--spacing-6)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'var(--text-secondary)',
              mb: 'var(--spacing-1)'
            }}
          >
            No photos available
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'var(--text-secondary)',
              opacity: 0.7
            }}
          >
            Add a photo source in settings
          </Typography>
        </Box>
      )}

      {!loading && !error && photos.length > 0 && currentPhotosData.length > 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ 
            position: 'relative', 
            flex: 1,
            minHeight: 0,
            maxHeight: '100%',
            overflow: 'hidden', 
            borderRadius: 'var(--border-radius-large, 16px)', 
            mb: 'var(--spacing-3)',
            backgroundColor: 'var(--surface)',
            boxShadow: 'var(--elevation-2)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-2)'
          }}>
            <Box
              key={currentPhotoIndex}
              sx={{
                display: 'flex',
                flexDirection: currentOrientation === 'portrait' ? 'row' : 'column',
                gap: 'var(--spacing-3)',
                width: '100%',
                height: '100%',
                animation: transitionType === 'fade' ? 'fadeIn 0.6s ease-in-out' :
                          transitionType === 'slide' ? 'slideIn 0.6s ease-in-out' : 'none',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0 },
                  '100%': { opacity: 1 }
                },
                '@keyframes slideIn': {
                  '0%': { transform: 'translateX(100%)', opacity: 0 },
                  '100%': { transform: 'translateX(0)', opacity: 1 }
                }
              }}
            >
              {currentPhotosData.map(({ photo, index: photoIndex }) => {
                const imageKey = `${photo.id}`;
                const imageUrl = `${getApiUrl()}${photo.url}`;
                const hasFailed = failedImages.has(imageKey);
                
                return (
                  <Box
                    key={imageKey}
                    sx={{
                      flex: `1 1 ${100 / currentPhotosData.length}%`,
                      overflow: 'hidden',
                      borderRadius: 'var(--border-radius-medium, 12px)',
                      backgroundColor: 'var(--card-bg)',
                      boxShadow: 'var(--elevation-1)',
                      border: '1px solid var(--card-border)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      padding: 'var(--spacing-1)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 'var(--elevation-3)'
                      }
                    }}
                  >
                    {hasFailed ? (
                      <Box sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px'
                      }}>
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>Image unavailable</Typography>
                      </Box>
                    ) : (
                      <Box sx={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        borderRadius: 'var(--border-radius-small, 8px)'
                      }}>
                        <img
                          src={imageUrl}
                          alt="Photo"
                          onLoad={(e) => {
                            handleImageLoad(e, photo);
                            const target = e.target;
                            const currentRetryCount = retryCounts.get(imageKey) || 0;
                            
                            if (failedImages.has(imageKey)) {
                              setFailedImages(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(imageKey);
                                return newSet;
                              });
                            }
                            if (currentRetryCount > 0) {
                              setRetryCounts(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(imageKey);
                                return newMap;
                              });
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                          onError={(e) => {
                            const target = e.target;
                            const imgSrc = target.src;
                            const currentRetryCount = retryCounts.get(imageKey) || 0;
                            const maxRetries = 2;
                            
                            const errorDetails = {
                              url: imgSrc,
                              photoId: photo.id,
                              photoUrl: photo.url,
                              apiUrl: getApiUrl(),
                              timestamp: new Date().toISOString(),
                              retryCount: currentRetryCount
                            };
                            
                            console.error('Image load error:', errorDetails);
                            
                            if (currentRetryCount < maxRetries) {
                              console.log(`Retrying image load (attempt ${currentRetryCount + 1}/${maxRetries})...`);
                              setRetryCounts(prev => {
                                const newMap = new Map(prev);
                                newMap.set(imageKey, currentRetryCount + 1);
                                return newMap;
                              });
                              
                              setTimeout(() => {
                                const separator = imgSrc.includes('?') ? '&' : '?';
                                target.src = `${imgSrc}${separator}_retry=${Date.now()}`;
                              }, 500 * (currentRetryCount + 1));
                            } else {
                              console.error('Image failed after max retries:', errorDetails);
                              if (!failedImages.has(imageKey)) {
                                setFailedImages(prev => new Set([...prev, imageKey]));
                              }
                              target.style.display = 'none';
                            }
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

          </Box>

          {showPhotoCount && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexShrink: 0
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '0.875rem'
                }}
              >
                {currentPhotoIndex + 1} - {Math.min(currentPhotoIndex + currentPhotosData.length, photos.length)} / {photos.length}
              </Typography>
              {currentPhotosData.length === 1 && (
                <Chip
                  label={currentPhotosData[0].photo.source_name}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--card-bg)'
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      )}
      </Box>
    </Card>
  );
};

export default PhotoWidget;
