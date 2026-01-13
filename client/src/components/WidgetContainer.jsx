import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Button, ButtonGroup } from '@mui/material';
import { DragIndicator, Close, Remove, Add, RestartAlt } from '@mui/icons-material';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

/**
 * Container component that manages multiple draggable widgets
 * Provides a responsive grid system for optimal layout
 */
const WidgetContainer = ({ children, widgets = [], locked = true, onLayoutChange: onLayoutChangeCallback }) => {
  const [containerWidth, setContainerWidth] = useState(1200);
  const [gridCols, setGridCols] = useState(12);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [layout, setLayout] = useState([]);
  const [isLockTransitioning, setIsLockTransitioning] = useState(false);
  const containerRef = React.useRef(null);

  // Update container width and grid columns based on screen size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Get the computed style to account for padding
        const computedStyle = window.getComputedStyle(containerRef.current);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 24;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 24;
        
        // Calculate available width: viewport width minus container padding
        const viewportWidth = window.innerWidth;
        const availableWidth = viewportWidth - paddingLeft - paddingRight;
        
        // Use the smaller of clientWidth or calculated available width
        const width = Math.min(containerRef.current.clientWidth, availableWidth);
        setContainerWidth(Math.max(0, width)); // Ensure non-negative

        // Responsive grid columns - MD3 breakpoints
        if (width < 768) {
          setGridCols(4); // Mobile: 4 columns
        } else if (width < 1280) {
          setGridCols(8); // Tablet: 8 columns
        } else {
          setGridCols(12); // Desktop: 12 columns
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize layout from localStorage or defaults (only on mount or when widgets change)
  useEffect(() => {
    if (!widgets || widgets.length === 0) {
      setLayout([]);
      return;
    }

    try {
      const initialLayout = widgets.map((widget) => {
        if (!widget || !widget.id) {
          console.error('Invalid widget in array:', widget);
          return null;
        }

        try {
          const savedLayout = localStorage.getItem(`widget-layout-${widget.id}`);
          if (savedLayout) {
            const parsed = JSON.parse(savedLayout);
            return {
              i: widget.id,
              x: parsed.x ?? widget.defaultPosition?.x ?? 0,
              y: parsed.y ?? widget.defaultPosition?.y ?? 0,
              w: parsed.w ?? widget.defaultSize?.width ?? 4,
              h: parsed.h ?? widget.defaultSize?.height ?? 4,
              minW: widget.minWidth ?? 3,
              minH: widget.minHeight ?? 2,
              static: locked,
            };
          }
        } catch (parseError) {
          console.error(`Error parsing saved layout for widget ${widget.id}:`, parseError);
        }

        return {
          i: widget.id,
          x: widget.defaultPosition?.x ?? 0,
          y: widget.defaultPosition?.y ?? 0,
          w: widget.defaultSize?.width ?? 4,
          h: widget.defaultSize?.height ?? 4,
          minW: widget.minWidth ?? 3,
          minH: widget.minHeight ?? 2,
          static: locked,
        };
      }).filter(Boolean); // Remove any null entries
      
      setLayout(initialLayout);
    } catch (error) {
      console.error('Error initializing widget layout:', error);
      setLayout([]);
    }
  }, [widgets, locked]);

  // Update static property when lock state changes (without recreating entire layout)
  useEffect(() => {
    setIsLockTransitioning(true);

    setLayout((currentLayout) =>
      currentLayout.map(item => ({
        ...item,
        static: locked
      }))
    );

    // Re-enable transitions after a short delay
    const timer = setTimeout(() => {
      setIsLockTransitioning(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [locked]);

  // Deselect widget when locked
  useEffect(() => {
    if (locked) {
      setSelectedWidget(null);
    }
  }, [locked]);

  // Save layout to localStorage and notify parent
  const handleLayoutChange = (newLayout) => {
    if (locked) return; // Don't save if locked

    // Update layout with static property based on locked state
    const updatedLayout = newLayout.map(item => ({
      ...item,
      static: locked
    }));

    setLayout(updatedLayout);
    newLayout.forEach((item) => {
      const layoutData = {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      };
      localStorage.setItem(`widget-layout-${item.i}`, JSON.stringify(layoutData));
    });

    // Notify parent component of layout change
    if (onLayoutChangeCallback) {
      onLayoutChangeCallback(newLayout);
    }
  };

  // Handle resize from toolbar (simplified - width/height only)
  const handleToolbarResize = (widgetId, dimension, delta) => {
    if (locked) return;
    
    setLayout((currentLayout) => {
      const newLayout = currentLayout.map((item) => {
        if (item.i === widgetId) {
          const updatedItem = { ...item, static: locked };
          
          if (dimension === 'width') {
            const newWidth = Math.max((item.minW || 3), Math.min(gridCols - item.x, item.w + delta));
            return { ...updatedItem, w: newWidth };
          } else if (dimension === 'height') {
            const newHeight = Math.max((item.minH || 2), item.h + delta);
            return { ...updatedItem, h: newHeight };
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // Save to localStorage
      newLayout.forEach((item) => {
        if (item.i === widgetId) {
          localStorage.setItem(`widget-layout-${item.i}`, JSON.stringify({
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          }));
        }
      });
      
      return newLayout;
    });
  };

  // Handle resize button clicks (both increment and decrement) - kept for backward compatibility
  const handleResize = (widgetId, direction, isDecrement = false) => {
    if (locked) {
      return;
    }

    setLayout((currentLayout) => {
      const newLayout = currentLayout.map((item) => {
        if (item.i === widgetId) {
          const updatedItem = { ...item, static: locked };
          const delta = isDecrement ? -1 : 1;

          switch (direction) {
            case 'right':
              if (isDecrement) {
                if (item.w > item.minW) {
                  updatedItem.w = item.w - 1;
                }
              } else {
                if (item.x + item.w < gridCols) {
                  updatedItem.w = item.w + 1;
                }
              }
              break;
            case 'left':
              if (isDecrement) {
                if (item.w > item.minW) {
                  updatedItem.x = item.x + 1;
                  updatedItem.w = item.w - 1;
                }
              } else {
                if (item.x > 0) {
                  updatedItem.x = item.x - 1;
                  updatedItem.w = item.w + 1;
                }
              }
              break;
            case 'bottom':
              if (isDecrement) {
                if (item.h > item.minH) {
                  updatedItem.h = item.h - 1;
                }
              } else {
                updatedItem.h = item.h + 1;
              }
              break;
            case 'top':
              if (isDecrement) {
                if (item.h > item.minH) {
                  updatedItem.y = item.y + 1;
                  updatedItem.h = item.h - 1;
                }
              } else {
                if (item.y > 0) {
                  updatedItem.y = item.y - 1;
                  updatedItem.h = item.h + 1;
                }
              }
              break;
          }

          // Save to localStorage
          const layoutData = {
            x: updatedItem.x,
            y: updatedItem.y,
            w: updatedItem.w,
            h: updatedItem.h,
          };
          localStorage.setItem(`widget-layout-${item.i}`, JSON.stringify(layoutData));

          return updatedItem;
        }
        return { ...item, static: locked };
      });

      // Notify parent component of layout change
      if (onLayoutChangeCallback) {
        onLayoutChangeCallback(newLayout);
      }

      return newLayout;
    });
  };

  const handleWidgetClick = (widgetId, e) => {
    if (locked) return; // Don't select if locked
    // Allow selection when clicking on the widget wrapper or non-interactive areas
    // Don't select if clicking on interactive elements (buttons, inputs, etc.)
    const target = e.target;
    const isInteractive = target.closest('button, a, input, select, textarea, [role="button"], .MuiButton-root, .MuiIconButton-root');
    const isToolbar = target.closest('.layout-toolbar');
    
    // If clicking on interactive elements or toolbar, don't change selection
    if (isInteractive || isToolbar) {
      // If clicking on interactive element and widget is not selected, select it
      // This allows clicking buttons to also select the widget
      if (!isInteractive || selectedWidget !== widgetId) {
        return;
      }
    }
    
    // If clicking on drag handle when already selected, don't change selection
    if (target.closest('.drag-handle') && selectedWidget === widgetId) {
      return;
    }
    
    setSelectedWidget(widgetId);
  };

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.widget-wrapper') && !e.target.closest('.layout-toolbar')) {
        if (selectedWidget) {
          setSelectedWidget(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedWidget]);

  // Keyboard shortcuts for layout editing
  useEffect(() => {
    if (!selectedWidget || locked) return;

    const handleKeyDown = (e) => {
      // Escape to close toolbar
      if (e.key === 'Escape') {
        setSelectedWidget(null);
        return;
      }

      // Arrow keys for resize (with modifiers)
      if (e.key.startsWith('Arrow')) {
        const currentLayout = layout.find(l => l && l.i === selectedWidget);
        if (!currentLayout) return;

        e.preventDefault();
        const delta = e.shiftKey ? 2 : 1; // Shift = 2 units, normal = 1 unit

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const direction = e.key === 'ArrowLeft' ? -delta : delta;
          handleToolbarResize(selectedWidget, 'width', direction);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const direction = e.key === 'ArrowUp' ? -delta : delta;
          handleToolbarResize(selectedWidget, 'height', direction);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidget, locked, layout]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        maxWidth: '100%', // Ensure it doesn't exceed viewport
        minHeight: '100vh',
        padding: 3, // Increased from 2 (16px) to 3 (24px) for better spacing
        position: 'relative',
        backgroundColor: 'var(--background)',
        boxSizing: 'border-box', // Include padding in width calculation
        overflowX: 'hidden', // Prevent horizontal overflow
        '& .react-grid-item': {
          transition: (selectedWidget || isLockTransitioning) ? 'none !important' : 'all 200ms ease',
          transitionProperty: 'left, top, width, height',
        },
        '& .react-grid-item.cssTransforms': {
          transitionProperty: (selectedWidget || isLockTransitioning) ? 'none !important' : 'transform, width, height',
        },
        '& .react-grid-item.react-grid-placeholder': {
          background: 'var(--accent)',
          opacity: 0.2,
          borderRadius: '8px',
          zIndex: 2,
          transition: 'all 100ms ease',
        },
      }}
    >
      {layout.length > 0 && (
        <Box
          sx={{
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <GridLayout
            className="layout"
            layout={layout}
            cols={gridCols}
            rowHeight={120} // Increased from 100px to 120px for better proportions
            width={containerWidth}
            onLayoutChange={handleLayoutChange}
            isDraggable={!locked}
            isResizable={false}
            compactType={null}
            preventCollision={true}
            margin={[24, 24]} // Increased from [16, 16] to [24, 24] for better breathing room
            containerPadding={[0, 0]}
            useCSSTransforms={true}
            draggableHandle=".drag-handle"
            draggableCancel=".widget-content"
          >
          {widgets.map((widget) => {
            if (!widget || !widget.id) {
              console.error('Invalid widget:', widget);
              return null;
            }

            try {
              const isSelected = !locked && selectedWidget === widget.id;
              const currentLayout = layout.find(l => l && l.i === widget.id);
              
              if (!currentLayout) {
                console.warn(`No layout found for widget ${widget.id}`);
                return null;
              }

              const canDecreaseWidth = currentLayout.w > (currentLayout.minW || 3);
              const canDecreaseHeight = currentLayout.h > (currentLayout.minH || 2);
              const canIncreaseWidth = currentLayout.x + currentLayout.w < gridCols;
              const canIncreaseLeft = currentLayout.x > 0;
              const canIncreaseTop = currentLayout.y > 0;
              const isTopRow = currentLayout.y === 0; // Check if widget is in top row

            return (
              <Box
                key={widget.id}
                className={`widget-wrapper ${isSelected ? 'selected' : ''}`}
                data-grid={{ ...currentLayout }}
                onClick={(e) => handleWidgetClick(widget.id, e)}
                sx={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  border: '1px solid var(--card-border)', // Subtle 1px border instead of 3px
                  borderRadius: 3, // MD3: 16px (was 8px)
                  transition: 'outline 0.2s ease, box-shadow 0.2s ease',
                  outline: isSelected ? '2px solid var(--accent)' : 'none', // Use outline for selection
                  outlineOffset: '2px',
                  // MD3 elevation system
                  boxShadow: isSelected
                    ? '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)' // Level 3
                    : '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)', // Level 1
                  backgroundColor: 'var(--card-bg)',
                  overflow: isSelected ? 'visible' : 'hidden', // Allow toolbar to show when selected
                  cursor: locked ? 'default' : (isSelected ? 'move' : 'pointer'),
                  '&:hover': {
                    outline: locked 
                      ? 'none'
                      : (isSelected 
                        ? '2px solid var(--accent)' 
                        : '1px solid rgba(158, 127, 255, 0.3)'),
                    boxShadow: locked
                      ? '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)' // Level 1
                      : (isSelected 
                        ? '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)' // Level 3
                        : '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)'), // Level 2
                  }
                }}
              >
                {/* Inline Layout Editing Toolbar - Only visible when selected and unlocked */}
                {isSelected && !locked && (
                  <>
                    {/* Floating Toolbar - Positioned above or below widget based on row */}
                    <Box
                      className="layout-toolbar"
                      sx={{
                        position: 'absolute',
                        ...(isTopRow 
                          ? { 
                              bottom: -60, // Position below widget if in top row
                              animation: 'slideUp 0.2s ease-out',
                              '@keyframes slideUp': {
                                '0%': {
                                  opacity: 0,
                                  transform: 'translateX(-50%) translateY(8px)',
                                },
                                '100%': {
                                  opacity: 1,
                                  transform: 'translateX(-50%) translateY(0)',
                                },
                              },
                            }
                          : { 
                              top: -60, // Position above widget if not in top row
                              animation: 'slideDown 0.2s ease-out',
                              '@keyframes slideDown': {
                                '0%': {
                                  opacity: 0,
                                  transform: 'translateX(-50%) translateY(-8px)',
                                },
                                '100%': {
                                  opacity: 1,
                                  transform: 'translateX(-50%) translateY(0)',
                                },
                              },
                            }
                        ),
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: '8px 16px',
                        backgroundColor: 'var(--card-bg)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 3, // 12px - MD3 medium border radius
                        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)', // MD3 elevation level 2
                        border: '1px solid var(--card-border)',
                        zIndex: 1004,
                        pointerEvents: 'auto',
                        minWidth: '320px',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Widget Name */}
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text)', minWidth: '80px' }}>
                        {widget.name || widget.id}
                      </Typography>

                      {/* Dimensions Display */}
                      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {currentLayout.w}×{currentLayout.h}
                      </Typography>

                      {/* Divider */}
                      <Box sx={{ width: '1px', height: '24px', backgroundColor: 'var(--card-border)' }} />

                      {/* Width Controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                          W:
                        </Typography>
                        <ButtonGroup size="small" variant="outlined">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToolbarResize(widget.id, 'width', -1);
                            }}
                            disabled={!canDecreaseWidth}
                            sx={{ 
                              padding: '4px',
                              minWidth: '32px',
                              '&:disabled': { opacity: 0.3 }
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToolbarResize(widget.id, 'width', 1);
                            }}
                            disabled={!canIncreaseWidth}
                            sx={{ 
                              padding: '4px',
                              minWidth: '32px',
                              '&:disabled': { opacity: 0.3 }
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </ButtonGroup>
                      </Box>

                      {/* Height Controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                          H:
                        </Typography>
                        <ButtonGroup size="small" variant="outlined">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToolbarResize(widget.id, 'height', -1);
                            }}
                            disabled={!canDecreaseHeight}
                            sx={{ 
                              padding: '4px',
                              minWidth: '32px',
                              '&:disabled': { opacity: 0.3 }
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToolbarResize(widget.id, 'height', 1);
                            }}
                            sx={{ 
                              padding: '4px',
                              minWidth: '32px'
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </ButtonGroup>
                      </Box>

                      {/* Close Button */}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWidget(null);
                        }}
                        sx={{
                          marginLeft: 'auto',
                          padding: '4px',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Invisible Drag Handle - Only for dragging, positioned behind content */}
                    <Box
                      className="drag-handle"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        cursor: 'move',
                        zIndex: 1000, // Behind content but above widget wrapper
                        userSelect: 'none',
                        pointerEvents: locked ? 'none' : (isSelected ? 'none' : 'none'), // Don't block clicks, only used for dragging
                      }}
                    />
                  </>
                )}

                {/* Widget Content */}
                <Box
                  className="widget-content"
                  sx={{
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                    pointerEvents: 'auto', // Always allow pointer events so clicks work
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 2, // Minimum 16px padding (2 * 8px), can be overridden by widgets
                    position: 'relative', // Ensure content is positioned correctly
                    zIndex: 1, // Below toolbar
                  }}
                  onClick={(e) => {
                    // Allow clicks on content to select widget if not already selected
                    // But don't interfere with interactive elements
                    const target = e.target;
                    const isInteractive = target.closest('button, a, input, select, textarea, [role="button"], .MuiButton-root, .MuiIconButton-root, .rbc-event, .rbc-day-slot');
                    if (!isInteractive && !isSelected) {
                      handleWidgetClick(widget.id, e);
                    }
                  }}
                >
                  {widget.content || <Box sx={{ p: 2 }}>Widget content not available</Box>}
                </Box>
              </Box>
            );
            } catch (error) {
              console.error(`Error rendering widget ${widget?.id}:`, error);
              return (
                <Box key={widget?.id || 'error'} sx={{ p: 2, color: 'var(--error)' }}>
                  Error rendering widget: {error.message}
                </Box>
              );
            }
          }).filter(Boolean)}
          </GridLayout>
        </Box>
      )}
      {children}
    </Box>
  );
};

export default WidgetContainer;

