import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [toolbarPositions, setToolbarPositions] = useState({});
  const containerRef = React.useRef(null);
  const widgetRefs = useRef({});

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
            const x = parsed.x ?? widget.defaultPosition?.x ?? 0;
            return {
              i: widget.id,
              x: x,
              y: parsed.y ?? widget.defaultPosition?.y ?? 0,
              w: parsed.w ?? widget.defaultSize?.width ?? 4,
              h: parsed.h ?? widget.defaultSize?.height ?? 4,
              minW: widget.minWidth ?? 3,
              minH: widget.minHeight ?? 2,
              maxW: gridCols - x, // Maximum width from current position to end of grid
              static: locked,
            };
          }
        } catch (parseError) {
          console.error(`Error parsing saved layout for widget ${widget.id}:`, parseError);
        }

        const x = widget.defaultPosition?.x ?? 0;
        return {
          i: widget.id,
          x: x,
          y: widget.defaultPosition?.y ?? 0,
          w: widget.defaultSize?.width ?? 4,
          h: widget.defaultSize?.height ?? 4,
          minW: widget.minWidth ?? 3,
          minH: widget.minHeight ?? 2,
          maxW: gridCols - x, // Maximum width from current position to end of grid
          static: locked,
        };
      }).filter(Boolean); // Remove any null entries
      
      setLayout(initialLayout);
    } catch (error) {
      console.error('Error initializing widget layout:', error);
      setLayout([]);
    }
  }, [widgets, locked, gridCols]);

  // Update static property and maxW when lock state or gridCols changes
  useEffect(() => {
    setIsLockTransitioning(true);

    setLayout((currentLayout) =>
      currentLayout.map(item => ({
        ...item,
        static: locked,
        maxW: gridCols - item.x, // Update maxW when gridCols changes
      }))
    );

    // Re-enable transitions after a short delay
    const timer = setTimeout(() => {
      setIsLockTransitioning(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [locked, gridCols]);

  // Deselect widget when locked
  useEffect(() => {
    if (locked) {
      setSelectedWidget(null);
    }
  }, [locked]);

  // Calculate toolbar positions when widget is selected or layout changes
  const calculateToolbarPosition = React.useCallback((widgetId) => {
    console.log('[Toolbar Debug] calculateToolbarPosition called for:', widgetId);
    const widgetElement = widgetRefs.current[widgetId];
    console.log('[Toolbar Debug] widgetElement:', widgetElement);
    if (!widgetElement) {
      console.log('[Toolbar Debug] No widget element found for:', widgetId);
      return null;
    }

    const rect = widgetElement.getBoundingClientRect();
    console.log('[Toolbar Debug] getBoundingClientRect:', rect);
    const currentLayoutItem = layout.find(l => l && l.i === widgetId);
    console.log('[Toolbar Debug] currentLayoutItem:', currentLayoutItem);
    if (!currentLayoutItem) {
      console.log('[Toolbar Debug] No layout item found for:', widgetId);
      return null;
    }

    const isTopRow = currentLayoutItem.y === 0;
    const toolbarHeight = 60; // Height of toolbar + spacing

    const position = {
      top: isTopRow ? rect.bottom + 24 : rect.top - toolbarHeight,
      left: rect.left + rect.width / 2,
      transform: 'translateX(-50%)',
      widgetId: widgetId
    };
    console.log('[Toolbar Debug] Calculated position:', position);
    return position;
  }, [layout]);

  useEffect(() => {
    console.log('[Toolbar Debug] Position calculation effect - selectedWidget:', selectedWidget, 'locked:', locked);
    if (selectedWidget && !locked) {
      // Use a small delay to ensure refs are set and DOM is updated
      const timer = setTimeout(() => {
        console.log('[Toolbar Debug] Attempting to calculate position for:', selectedWidget);
        const position = calculateToolbarPosition(selectedWidget);
        if (position) {
          console.log('[Toolbar Debug] Position calculated successfully, updating state');
          setToolbarPositions(prev => ({
            ...prev,
            [selectedWidget]: position
          }));
        } else {
          console.log('[Toolbar Debug] Position calculation failed, retrying...');
          // Retry if position calculation failed (ref might not be ready)
          setTimeout(() => {
            const retryPosition = calculateToolbarPosition(selectedWidget);
            if (retryPosition) {
              console.log('[Toolbar Debug] Retry successful, updating state');
              setToolbarPositions(prev => ({
                ...prev,
                [selectedWidget]: retryPosition
              }));
            } else {
              console.log('[Toolbar Debug] Retry also failed');
            }
          }, 50);
        }
      }, 10);
      
      return () => clearTimeout(timer);
    } else {
      console.log('[Toolbar Debug] Clearing positions - selectedWidget:', selectedWidget, 'locked:', locked);
      // Clear positions when no widget is selected
      setToolbarPositions({});
    }
  }, [selectedWidget, locked, calculateToolbarPosition]);

  // Update toolbar positions on window resize and scroll
  useEffect(() => {
    if (!selectedWidget || locked) return;

    const updatePosition = () => {
      const position = calculateToolbarPosition(selectedWidget);
      if (position) {
        setToolbarPositions(prev => ({
          ...prev,
          [selectedWidget]: position
        }));
      }
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); // Use capture phase to catch all scroll events

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [selectedWidget, locked, calculateToolbarPosition]);

  // Save layout to localStorage and notify parent
  const handleLayoutChange = (newLayout) => {
    if (locked) return; // Don't save if locked

    // Update layout with static property and maxW based on locked state and gridCols
    const updatedLayout = newLayout.map(item => ({
      ...item,
      static: locked,
      maxW: gridCols - item.x, // Update maxW when position changes
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
      // First, handle width resizing with collision detection and pushing widgets down
      if (dimension === 'width' && delta > 0) {
        const resizingWidget = currentLayout.find(item => item.i === widgetId);
        if (!resizingWidget) return currentLayout;
        
        const maxWidth = gridCols - resizingWidget.x;
        const proposedWidth = resizingWidget.w + delta;
        const currentEndX = resizingWidget.x + resizingWidget.w;
        const proposedEndX = resizingWidget.x + proposedWidth;
        
        // Find widgets that would be in the expansion path (on same row, overlapping expansion area)
        const conflictingWidgets = currentLayout.filter(otherItem => 
          otherItem.i !== widgetId && 
          otherItem.y === resizingWidget.y && // Same row
          otherItem.x < proposedEndX && // Starts before our proposed end
          otherItem.x + otherItem.w > currentEndX // Overlaps with our expansion area
        );
        
        // Calculate new layout with conflicting widgets pushed down
        let updatedLayout = [...currentLayout];
        
        if (conflictingWidgets.length > 0) {
          // Start pushing widgets from the row below the resizing widget
          const startY = resizingWidget.y + resizingWidget.h;
          
          // Move conflicting widgets down to new rows
          conflictingWidgets.forEach(conflictWidget => {
            // Find the next available row that doesn't have collisions
            // Start from the row below the resizing widget
            let newY = startY;
            let hasCollision = true;
            
            // Keep trying rows until we find one without collisions
            while (hasCollision) {
              // Check if this row has any widgets that would collide with our widget
              hasCollision = updatedLayout.some(otherItem => 
                otherItem.i !== conflictWidget.i &&
                otherItem.y === newY &&
                otherItem.x < conflictWidget.x + conflictWidget.w &&
                otherItem.x + otherItem.w > conflictWidget.x
              );
              
              if (hasCollision) {
                newY++;
              }
            }
            
            // Update the conflicting widget's position
            const conflictIndex = updatedLayout.findIndex(item => item.i === conflictWidget.i);
            if (conflictIndex !== -1) {
              updatedLayout[conflictIndex] = {
                ...updatedLayout[conflictIndex],
                y: newY,
                maxW: gridCols - updatedLayout[conflictIndex].x, // Update maxW for new position
                static: locked, // Maintain lock state
              };
            }
          });
        }
        
        // Now update the resizing widget's width
        const resizingIndex = updatedLayout.findIndex(item => item.i === widgetId);
        if (resizingIndex !== -1) {
          const actualMaxWidth = gridCols - resizingWidget.x;
          const newWidth = Math.max((resizingWidget.minW || 3), Math.min(actualMaxWidth, proposedWidth));
          
          updatedLayout[resizingIndex] = {
            ...updatedLayout[resizingIndex],
            w: newWidth,
            maxW: actualMaxWidth,
            static: locked,
          };
        }
        
        // Save all changed widgets to localStorage
        updatedLayout.forEach((item) => {
          if (item.i === widgetId || conflictingWidgets.some(c => c.i === item.i)) {
            localStorage.setItem(`widget-layout-${item.i}`, JSON.stringify({
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            }));
          }
        });
        
        return updatedLayout;
      }
      
      // Handle width decrease or height changes (no collision pushing needed)
      const newLayout = currentLayout.map((item) => {
        if (item.i === widgetId) {
          const updatedItem = { ...item, static: locked };
          
          if (dimension === 'width') {
            // Width decrease - no need to push widgets
            const maxWidth = gridCols - item.x;
            const proposedWidth = item.w + delta;
            const newWidth = Math.max((item.minW || 3), Math.min(maxWidth, proposedWidth));
            
            return { 
              ...updatedItem, 
              w: newWidth,
              maxW: maxWidth,
            };
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
        overflowY: 'visible', // Allow vertical overflow for toolbars
        '& .react-grid-item': {
          transition: (selectedWidget || isLockTransitioning) ? 'none !important' : 'all 200ms ease',
          transitionProperty: 'left, top, width, height',
          overflow: 'visible !important', // Allow toolbars to extend outside grid items
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
            overflow: 'visible', // Allow toolbars to extend outside widget boundaries
            position: 'relative',
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
              // Widget can increase width up to gridCols (conflicting widgets will be pushed down)
              const maxWidth = gridCols - currentLayout.x;
              const canIncreaseWidth = currentLayout.w < maxWidth;
              const canIncreaseLeft = currentLayout.x > 0;
              const canIncreaseTop = currentLayout.y > 0;
              const isTopRow = currentLayout.y === 0; // Check if widget is in top row

            return (
              <Box
                key={widget.id}
                ref={(el) => {
                  if (el) {
                    console.log('[Toolbar Debug] Ref set for widget:', widget.id, 'element:', el);
                    widgetRefs.current[widget.id] = el;
                    // Recalculate position if this widget is selected
                    if (selectedWidget === widget.id && !locked) {
                      console.log('[Toolbar Debug] Widget is selected, recalculating position');
                      setTimeout(() => {
                        const position = calculateToolbarPosition(widget.id);
                        if (position) {
                          console.log('[Toolbar Debug] Position recalculated from ref callback');
                          setToolbarPositions(prev => ({
                            ...prev,
                            [widget.id]: position
                          }));
                        }
                      }, 10);
                    }
                  } else {
                    console.log('[Toolbar Debug] Ref cleared for widget:', widget.id);
                    delete widgetRefs.current[widget.id];
                  }
                }}
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
                  overflow: 'hidden', // Always contain widget content
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
                {/* Toolbar is rendered via portal - see below */}
                
                {/* Invisible Drag Handle - Only for dragging, positioned behind content */}
                {isSelected && !locked && (
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
                      pointerEvents: 'none', // Don't block clicks, only used for dragging
                    }}
                  />
                )}

                {/* Widget Content */}
                <Box
                  className="widget-content"
                  sx={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden', // No scrollbars - content should fit or be handled by widget
                    pointerEvents: 'auto', // Always allow pointer events so clicks work
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 2, // Minimum 16px padding (2 * 8px), can be overridden by widgets
                    position: 'relative', // Ensure content is positioned correctly
                    zIndex: 1, // Below toolbar
                    boxSizing: 'border-box', // Include padding in size calculations
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
      
      {/* Render toolbars via portal to avoid overflow clipping */}
      {selectedWidget && !locked && (() => {
        console.log('[Toolbar Debug] Portal rendering check - selectedWidget:', selectedWidget, 'locked:', locked);
        const position = toolbarPositions[selectedWidget];
        console.log('[Toolbar Debug] Position from state:', position);
        const currentLayoutItem = layout.find(l => l && l.i === selectedWidget);
        console.log('[Toolbar Debug] currentLayoutItem:', currentLayoutItem);
        const widget = widgets.find(w => w.id === selectedWidget);
        console.log('[Toolbar Debug] widget:', widget);
        if (!widget || !currentLayoutItem) {
          console.log('[Toolbar Debug] Missing widget or layout item, returning null');
          return null;
        }
        let positionToUse = position;
        if (!position) {
          console.log('[Toolbar Debug] No position available, calculating now');
          // Try to calculate position immediately
          const calculatedPosition = calculateToolbarPosition(selectedWidget);
          if (calculatedPosition) {
            console.log('[Toolbar Debug] Position calculated immediately, updating state');
            setToolbarPositions(prev => ({
              ...prev,
              [selectedWidget]: calculatedPosition
            }));
            // Return null to trigger re-render with calculated position
            return null;
          } else {
            console.log('[Toolbar Debug] Position calculation failed, using fallback');
            // Fallback position - top right of screen (will use container approach)
            positionToUse = {
              top: 16,
              right: 16,
              useFallbackContainer: true,
              widgetId: selectedWidget
            };
            console.log('[Toolbar Debug] Using fallback position:', positionToUse);
          }
        }

        const canDecreaseWidth = currentLayoutItem.w > (currentLayoutItem.minW || 3);
        const canDecreaseHeight = currentLayoutItem.h > (currentLayoutItem.minH || 2);
        const maxWidth = gridCols - currentLayoutItem.x;
        const canIncreaseWidth = currentLayoutItem.w < maxWidth;
        const isTopRow = currentLayoutItem.y === 0;

        console.log('[Toolbar Debug] Creating toolbar with position:', positionToUse);
        
        // If using fallback container, wrap toolbar in a container
        if (positionToUse.useFallbackContainer) {
          const toolbar = (
            <Box
              sx={{
                position: 'fixed',
                top: `${positionToUse.top}px`,
                right: `${positionToUse.right}px`,
                zIndex: 10000,
                display: 'flex',
                justifyContent: 'flex-end',
                pointerEvents: 'none',
              }}
            >
              <Box
                className="layout-toolbar"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '8px 16px',
                  backgroundColor: 'var(--card-bg)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 3,
                  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
                  border: '1px solid var(--card-border)',
                  pointerEvents: 'auto',
                  minWidth: '320px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
            {/* Widget Name */}
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text)', minWidth: '80px' }}>
              {widget.name || widget.id}
            </Typography>

            {/* Dimensions Display */}
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {currentLayoutItem.w}×{currentLayoutItem.h}
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
                    handleToolbarResize(selectedWidget, 'width', -1);
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
                    handleToolbarResize(selectedWidget, 'width', 1);
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
                    handleToolbarResize(selectedWidget, 'height', -1);
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
                    handleToolbarResize(selectedWidget, 'height', 1);
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
            </Box>
          );
          
          console.log('[Toolbar Debug] Creating portal to document.body (fallback container)');
          if (!document.body) {
            console.error('[Toolbar Debug] document.body is not available!');
            return null;
          }
          const portal = createPortal(toolbar, document.body);
          console.log('[Toolbar Debug] Portal created:', portal);
          return portal;
        }
        
        // Normal toolbar positioning (relative to widget)
        const toolbar = (
          <Box
            className="layout-toolbar"
            sx={{
              position: 'fixed',
              top: `${positionToUse.top}px`,
              left: `${positionToUse.left}px`,
              transform: positionToUse.transform,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '8px 16px',
              backgroundColor: 'var(--card-bg)',
              backdropFilter: 'blur(12px)',
              borderRadius: 3,
              boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
              border: '1px solid var(--card-border)',
              zIndex: 10000,
              pointerEvents: 'auto',
              minWidth: '320px',
              animation: isTopRow ? 'slideUp 0.2s ease-out' : 'slideDown 0.2s ease-out',
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
              animationFillMode: 'forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Widget Name */}
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text)', minWidth: '80px' }}>
              {widget.name || widget.id}
            </Typography>

            {/* Dimensions Display */}
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {currentLayoutItem.w}×{currentLayoutItem.h}
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
                    handleToolbarResize(selectedWidget, 'width', -1);
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
                    handleToolbarResize(selectedWidget, 'width', 1);
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
                    handleToolbarResize(selectedWidget, 'height', -1);
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
                    handleToolbarResize(selectedWidget, 'height', 1);
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
        );

        console.log('[Toolbar Debug] Creating portal to document.body');
        if (!document.body) {
          console.error('[Toolbar Debug] document.body is not available!');
          return null;
        }
        const portal = createPortal(toolbar, document.body);
        console.log('[Toolbar Debug] Portal created:', portal);
        return portal;
      })()}
    </Box>
  );
};

export default WidgetContainer;

