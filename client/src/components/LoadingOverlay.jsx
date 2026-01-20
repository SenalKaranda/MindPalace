import React, { useEffect, useState } from 'react';
import { Backdrop, Box, Typography } from '@mui/material';

/**
 * LoadingOverlay Component
 * Displays a full-screen loading overlay with the MindPalace logo and pulsing animation
 * 
 * @param {boolean} open - Controls visibility of the overlay
 * @param {string} message - Optional loading message to display below logo
 * @param {number} minDisplayTime - Minimum time in ms to show overlay (prevents flash on fast loads)
 */
const LoadingOverlay = ({ 
  open = false, 
  message = null,
  minDisplayTime = 500 
}) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (open) {
      // When opening, record start time
      const now = Date.now();
      setStartTime(now);
      setShouldShow(true);
    } else {
      // When closing, ensure minimum display time has passed
      if (startTime) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDisplayTime - elapsed);
        
        if (remaining > 0) {
          const timer = setTimeout(() => {
            setShouldShow(false);
            setStartTime(null);
          }, remaining);
          
          return () => clearTimeout(timer);
        } else {
          setShouldShow(false);
          setStartTime(null);
        }
      } else {
        setShouldShow(false);
      }
    }
  }, [open, minDisplayTime, startTime]);

  if (!shouldShow) return null;

  return (
    <Backdrop
      open={shouldShow}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 1,
        backgroundColor: 'rgba(var(--background-rgb, 15, 15, 15), 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          animation: 'fadeIn 0.3s ease-in',
        }}
      >
        {/* Logo with pulsing animation */}
        <Box
          component="img"
          src="/MindPalaceFullLogo.png"
          alt="MindPalace Logo"
          sx={{
            maxWidth: { xs: '250px', sm: '350px', md: '400px' },
            width: '100%',
            height: 'auto',
            animation: 'logoPulse 2.5s ease-in-out infinite',
            // Use CSS transform for GPU acceleration
            willChange: 'transform',
          }}
        />
        
        {/* Optional loading message */}
        {message && (
          <Typography
            variant="body1"
            sx={{
              color: 'var(--text-secondary)',
              opacity: 0.8,
              animation: 'fadeIn 0.5s ease-in 0.2s both',
              textAlign: 'center',
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay;
