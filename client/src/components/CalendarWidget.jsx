import React, { useState, useEffect } from 'react';
import { Card, Typography, Box, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, ToggleButton, ToggleButtonGroup, TextField, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import { ViewModule, ViewWeek, ViewDay, ViewAgenda, CalendarMonth, ChevronLeft, ChevronRight, Add, Delete, Edit, Refresh } from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const CalendarWidget = ({ transparentBackground, icsCalendarUrl }) => {
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  // Settings are now managed in Admin Panel
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventColors, setEventColors] = useState({
    backgroundColor: 'var(--primary)',
    textColor: 'var(--text)'
  });
  const [displaySettings, setDisplaySettings] = useState({
    textSize: 12,
    bulletSize: 10
  });
  // Color picker removed - settings now in Admin Panel
  const [calendarSources, setCalendarSources] = useState([]);

  // Initial data fetch
  useEffect(() => {
    fetchCalendarSources();
    fetchCalendarEvents();
    loadCalendarSettings();
  }, []);

  // Load calendar settings from API
  const loadCalendarSettings = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings`);
      const settings = response.data;
      setEventColors({
        backgroundColor: settings.CALENDAR_EVENT_BACKGROUND_COLOR || 'var(--primary)',
        textColor: settings.CALENDAR_EVENT_TEXT_COLOR || 'var(--text)'
      });
      setDisplaySettings({
        textSize: parseInt(settings.CALENDAR_TEXT_SIZE || '12'),
        bulletSize: parseInt(settings.CALENDAR_BULLET_SIZE || '10')
      });
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.calendar?.refreshInterval || 0;

    if (refreshInterval > 0) {
      console.log(`CalendarWidget: Auto-refresh enabled (${refreshInterval}ms)`);
      
      const intervalId = setInterval(() => {
        console.log('CalendarWidget: Auto-refreshing data...');
        fetchCalendarEvents();
      }, refreshInterval);

      return () => {
        console.log('CalendarWidget: Clearing auto-refresh interval');
        clearInterval(intervalId);
      };
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('calendarEventColors', JSON.stringify(eventColors));
  }, [eventColors]);

  useEffect(() => {
    localStorage.setItem('calendarDisplaySettings', JSON.stringify(displaySettings));

    const saveToDatabase = async () => {
      try {
        await axios.post(`${getApiUrl()}/api/settings`, {
          key: 'CALENDAR_TEXT_SIZE',
          value: displaySettings.textSize.toString()
        });
        await axios.post(`${getApiUrl()}/api/settings`, {
          key: 'CALENDAR_BULLET_SIZE',
          value: displaySettings.bulletSize.toString()
        });
      } catch (error) {
        console.error('Error saving display settings to database:', error);
      }
    };

    const timeoutId = setTimeout(saveToDatabase, 500);
    return () => clearTimeout(timeoutId);
  }, [displaySettings]);

  useEffect(() => {
    const loadDisplaySettings = async () => {
      try {
        const response = await axios.get(`${getApiUrl()}/api/settings`);
        const settings = response.data;

        if (settings.CALENDAR_TEXT_SIZE || settings.CALENDAR_BULLET_SIZE) {
          setDisplaySettings({
            textSize: settings.CALENDAR_TEXT_SIZE ? parseInt(settings.CALENDAR_TEXT_SIZE) : 12,
            bulletSize: settings.CALENDAR_BULLET_SIZE ? parseInt(settings.CALENDAR_BULLET_SIZE) : 10
          });
        }
      } catch (error) {
        console.error('Error loading display settings from database:', error);
      }
    };

    loadDisplaySettings();
  }, []);

  // Calendar sources are now managed in Admin Panel - we only fetch for display purposes
  const fetchCalendarSources = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/calendar-sources`);
      if (Array.isArray(response.data)) {
        setCalendarSources(response.data);
      } else {
        setCalendarSources([]);
      }
    } catch (error) {
      console.error('Error fetching calendar sources:', error);
      setCalendarSources([]);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${getApiUrl()}/api/calendar-events`);

      if (Array.isArray(response.data)) {
        const formattedEvents = response.data.map(event => ({
          id: event.id || Math.random().toString(),
          title: event.title || event.summary || 'Untitled Event',
          start: new Date(event.start),
          end: new Date(event.end),
          description: event.description || '',
          location: event.location || '',
          source_id: event.source_id,
          source_name: event.source_name,
          source_color: event.source_color
        }));

        console.log('CalendarWidget: Fetched events:', formattedEvents.length, formattedEvents);
        setEvents(formattedEvents);

        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const upcoming = formattedEvents
          .filter(event => event.start >= now && event.start <= nextWeek)
          .sort((a, b) => a.start - b.start)
          .slice(0, 5);

        setUpcomingEvents(upcoming);
      } else {
        setEvents([]);
        setUpcomingEvents([]);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setError('Failed to load calendar events. Please configure calendars in settings.');
      setEvents([]);
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  };


  const formatEventTime = (date) => {
    return moment(date).format('MMM D, h:mm A');
  };

  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    start: '',
    end: '',
    description: '',
    location: '',
    calendar_id: null
  });
  const [savingEvent, setSavingEvent] = useState(false);

  const handleSelectSlot = ({ start }) => {
    // Create new event on empty slot
    const startDate = moment(start);
    const endDate = moment(start).add(1, 'hour');
    setEventForm({
      title: '',
      start: startDate.format('YYYY-MM-DDTHH:mm'),
      end: endDate.format('YYYY-MM-DDTHH:mm'),
      description: '',
      location: '',
      calendar_id: calendarSources.length > 0 ? calendarSources[0].id : null
    });
    setEditingEvent(null);
    setShowEventDialog(true);
  };

  const handleSelectEvent = (event) => {
    // Edit existing event
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      start: moment(event.start).format('YYYY-MM-DDTHH:mm'),
      end: moment(event.end).format('YYYY-MM-DDTHH:mm'),
      description: event.description || '',
      location: event.location || '',
      calendar_id: event.source_id
    });
    setShowEventDialog(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.start || !eventForm.calendar_id) {
      alert('Please fill in all required fields (title, start date, and calendar).');
      return;
    }
    setSavingEvent(true);
    try {
      if (editingEvent) {
        await axios.put(`${getApiUrl()}/api/caldav/events/${editingEvent.id}`, {
          calendar_id: eventForm.calendar_id,
          summary: eventForm.title,
          start: eventForm.start,
          end: eventForm.end,
          description: eventForm.description,
          location: eventForm.location
        });
      } else {
        await axios.post(`${getApiUrl()}/api/caldav/events`, {
          calendar_id: eventForm.calendar_id,
          summary: eventForm.title,
          start: eventForm.start,
          end: eventForm.end,
          description: eventForm.description,
          location: eventForm.location
        });
      }
      await fetchCalendarEvents();
      setShowEventDialog(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await axios.delete(`${getApiUrl()}/api/caldav/events/${editingEvent.id}?calendar_id=${editingEvent.source_id}`);
      await fetchCalendarEvents();
      setShowEventDialog(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const getCurrentDayOfWeek = () => {
    return new Date().getDay();
  };

  useEffect(() => {
    const highlightCurrentWeek = () => {
      const today = new Date();
      const rows = document.querySelectorAll('.rbc-month-row');

      rows.forEach(row => {
        row.classList.remove('rbc-current-week');
        const dateCells = row.querySelectorAll('.rbc-date-cell');
        dateCells.forEach(cell => {
          const dateElement = cell.querySelector('button');
          if (dateElement) {
            const dateText = dateElement.textContent;
            const date = new Date(currentDate);
            date.setDate(parseInt(dateText));

            if (moment(date).isSame(today, 'week') && moment(date).isSame(currentDate, 'month')) {
              row.classList.add('rbc-current-week');
            }
          }
        });
      });
    };

    const timer = setTimeout(highlightCurrentWeek, 100);
    return () => clearTimeout(timer);
  }, [currentDate, events]);

  const getNext7Days = () => {
    const days = [];
    const startDate = new Date(currentDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = events.filter(event => 
        moment(event.start).isSame(moment(date), 'day')
      );
      
      days.push({
        date: date,
        dayName: moment(date).format('ddd'),
        dayNumber: moment(date).format('D'),
        monthName: moment(date).format('MMM'),
        isToday: moment(date).isSame(moment(new Date()), 'day'),
        events: dayEvents
      });
    }
    
    return days;
  };

  const handleSettingsClick = (event) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
    setShowColorPicker({ background: false, text: false });
  };

  const handleColorChange = (colorType, color) => {
    setEventColors(prev => ({
      ...prev,
      [colorType === 'background' ? 'backgroundColor' : 'textColor']: color.hex
    }));
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const getCurrentMonthYear = () => {
    return moment(currentDate).format('MMMM YYYY');
  };

  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === '3day') {
      newDate.setDate(newDate.getDate() - 3);
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === '3day') {
      newDate.setDate(newDate.getDate() + 3);
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const getCurrentPeriodLabel = () => {
    if (viewMode === 'year') {
      return moment(currentDate).format('YYYY');
    } else if (viewMode === 'month') {
      return moment(currentDate).format('MMMM YYYY');
    } else if (viewMode === 'week') {
      const startOfWeek = moment(currentDate);
      const endOfWeek = moment(currentDate).add(6, 'days');
      if (startOfWeek.month() === endOfWeek.month()) {
        return `${startOfWeek.format('MMM D')}-${endOfWeek.format('D, YYYY')}`;
      } else {
        return `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D, YYYY')}`;
      }
    } else if (viewMode === '3day') {
      const start = moment(currentDate);
      const end = moment(currentDate).add(2, 'days');
      if (start.month() === end.month()) {
        return `${start.format('MMM D')}-${end.format('D, YYYY')}`;
      } else {
        return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
      }
    } else if (viewMode === 'day') {
      return moment(currentDate).format('dddd, MMMM D, YYYY');
    }
    return '';
  };

  const CustomHeader = ({ date, label }) => {
    const today = new Date();
    const isToday = moment(date).isSame(today, 'day');
    const currentDayOfWeek = getCurrentDayOfWeek();
    const headerDayOfWeek = date.getDay();
    const isCurrentDayOfWeek = headerDayOfWeek === currentDayOfWeek;

    return (
      <div className={isCurrentDayOfWeek ? 'rbc-current-day-header' : ''}>
        {label}
      </div>
    );
  };

  if (loading) {
    return (
      <Card sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: transparentBackground ? 'transparent' : 'var(--card-bg)',
        border: transparentBackground ? 'none' : '1px solid var(--card-border)',
        boxShadow: transparentBackground ? 'none' : 'var(--elevation-1)'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '2px solid var(--primary)',
          background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)',
          backgroundSize: '100% 3px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.95rem'
          }}>
            📅 Calendar
          </Typography>
        </Box>
        <Box sx={{ 
          flex: 1,
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          p: 2
        }}>
          <CircularProgress />
          <Typography>Loading calendar events...</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <React.Fragment>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <IconButton
                onClick={handlePreviousPeriod}
                size="small"
                sx={{ color: 'var(--text)' }}
                aria-label="Previous period"
              >
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold',
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.95rem',
                minWidth: '200px', 
                textAlign: 'center' 
              }}>
                📅 {getCurrentPeriodLabel()}
              </Typography>
              <IconButton
                onClick={handleNextPeriod}
                size="small"
                sx={{ color: 'var(--text)' }}
                aria-label="Next period"
              >
                <ChevronRight />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="year" aria-label="year view" title="Yearly">
                  <ViewModule />
                </ToggleButton>
                <ToggleButton value="month" aria-label="month view" title="Monthly">
                  <CalendarMonth />
                </ToggleButton>
                <ToggleButton value="week" aria-label="week view" title="Weekly">
                  <ViewWeek />
                </ToggleButton>
                <ToggleButton value="3day" aria-label="3 day view" title="3 Day">
                  <ViewAgenda />
                </ToggleButton>
                <ToggleButton value="day" aria-label="day view" title="Daily">
                  <ViewDay />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
          
          {/* Calendar Legend */}
          {calendarSources.filter(source => source.enabled === 1).length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-md)',
              flexWrap: 'wrap',
              justifyContent: 'center',
              pt: 0.5
            }}>
              {calendarSources
                .filter(source => source.enabled === 1)
                .map((source) => (
                  <Box
                    key={source.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: source.color || 'var(--primary)',
                        border: '1px solid var(--card-border)',
                        flexShrink: 0
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500
                      }}
                    >
                      {source.name}
                    </Typography>
                  </Box>
                ))}
            </Box>
          )}
        </Box>
      </Box>
      
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2 }}>
        {error && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(var(--error-rgb), 0.1)', borderRadius: 'var(--border-radius-small)', flexShrink: 0 }}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </Box>
        )}

        {viewMode === 'year' ? (
          // Yearly View - 12 months grid
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: 'var(--spacing-md)',
              p: 1
            }}>
              {Array.from({ length: 12 }, (_, i) => {
                const monthDate = moment(currentDate).month(i);
                const monthStart = monthDate.startOf('month');
                const monthEnd = monthDate.endOf('month');
                const monthEvents = events.filter(event => {
                  if (!event.start) return false;
                  const eventMoment = moment(event.start);
                  return eventMoment.isSame(monthDate, 'month');
                });
                const isCurrentMonth = monthDate.month() === moment().month() && monthDate.year() === moment().year();
                
                return (
                  <Box
                    key={i}
                    onClick={() => {
                      setCurrentDate(monthDate.toDate());
                      setViewMode('month');
                    }}
                    sx={{
                      border: '1px solid var(--card-border)',
                      borderRadius: 'var(--border-radius-medium)',
                      p: 1.5,
                      cursor: 'pointer',
                      bgcolor: isCurrentMonth ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: isCurrentMonth ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(var(--background-rgb, 0, 0, 0), 0.05)',
                        transform: 'translateY(-2px)',
                        boxShadow: 'var(--elevation-1)'
                      }
                    }}
                  >
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 'bold', 
                        mb: 1,
                        color: isCurrentMonth ? 'var(--primary)' : 'inherit',
                        fontSize: 'clamp(0.8rem, 1.5vw, 1rem)'
                      }}
                    >
                      {monthDate.format('MMMM')}
                    </Typography>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)', 
                      gap: 0.25,
                      mb: 1
                    }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <Typography 
                          key={idx} 
                          variant="caption" 
                          sx={{ 
                            textAlign: 'center', 
                            fontSize: 'clamp(0.5rem, 1vw, 0.65rem)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {day}
                        </Typography>
                      ))}
                    </Box>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)', 
                      gap: 0.25
                    }}>
                      {Array.from({ length: monthStart.day() }, (_, idx) => (
                        <Box key={`empty-${idx}`} sx={{ aspectRatio: '1' }} />
                      ))}
                      {Array.from({ length: monthEnd.date() }, (_, idx) => {
                        const day = idx + 1;
                        const dayDate = moment(monthDate).date(day);
                        const dayEvents = monthEvents.filter(event => {
                          if (!event.start) return false;
                          return moment(event.start).isSame(dayDate, 'day');
                        });
                        const isToday = dayDate.isSame(moment(), 'day');
                        
                        return (
                          <Box
                            key={day}
                            sx={{
                              aspectRatio: '1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--border-radius-small)',
                              bgcolor: isToday ? 'var(--primary)' : 'transparent',
                              color: isToday ? 'var(--text)' : 'inherit',
                              fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
                              fontWeight: isToday ? 'bold' : 'normal',
                              position: 'relative'
                            }}
                          >
                            {day}
                            {dayEvents.length > 0 && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 2,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 4,
                                  height: 4,
                                  borderRadius: '50%',
                                  bgcolor: isToday ? 'var(--text)' : (dayEvents[0].source_color || eventColors.backgroundColor)
                                }}
                              />
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                    {monthEvents.length > 0 && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          mt: 1, 
                          color: 'var(--text-secondary)',
                          fontSize: 'clamp(0.6rem, 1vw, 0.7rem)'
                        }}
                      >
                        {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : viewMode === 'month' ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--spacing-sm)', mb: 'var(--spacing-sm)', flexShrink: 0 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Box key={day} sx={{ textAlign: 'center', fontWeight: 'bold', py: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)' }}>{day}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', gap: 'var(--spacing-sm)', minHeight: 0, overflow: 'hidden' }}>
          {(() => {
            const monthStart = moment(currentDate).startOf('month');
            const monthEnd = moment(currentDate).endOf('month');
            const startDate = moment(monthStart).startOf('week');
            const endDate = moment(monthEnd).endOf('week');

            const totalDays = endDate.diff(startDate, 'days') + 1;
            const numWeeks = Math.ceil(totalDays / 7);

            const days = [];
            let day = startDate.clone();

            while (day.isSameOrBefore(endDate, 'day')) {
              const dayEvents = events.filter(event => {
                if (!event.start) return false;
                const eventMoment = moment(event.start);
                return eventMoment.isSame(day, 'day');
              });

              const isCurrentMonth = day.month() === moment(currentDate).month();
              const isToday = day.isSame(moment(), 'day');
              const dayClone = day.clone();

              days.push(
                <Box
                  key={day.format('YYYY-MM-DD')}
                  onClick={() => handleSelectSlot({ start: dayClone.toDate() })}
                  sx={{
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--border-radius-small)',
                    p: 'clamp(4px, 0.5vw, 8px)',
                    cursor: 'pointer',
                    bgcolor: isToday ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.4,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden',
                    '&:hover': {
                      bgcolor: isToday ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(var(--background-rgb, 0, 0, 0), 0.05)'
                    }
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      flexShrink: 0,
                      mb: 0.5
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 'bold',
                        color: isToday ? 'var(--accent)' : 'inherit',
                        fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)'
                      }}
                    >
                      {day.format('D')}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {dayEvents.slice(0, 2).map((event, eventIndex) => (
                      <Box
                        key={eventIndex}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectEvent(event);
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          p: '3px 6px',
                          borderRadius: 'var(--border-radius-small)',
                          bgcolor: event.source_color || eventColors.backgroundColor,
                          cursor: 'pointer',
                          minHeight: '20px',
                          '&:hover': {
                            opacity: 0.9,
                            transform: 'scale(1.02)'
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: `clamp(6px, 1.2vw, ${displaySettings.bulletSize}px)`,
                            height: `clamp(6px, 1.2vw, ${displaySettings.bulletSize}px)`,
                            minWidth: `clamp(6px, 1.2vw, ${displaySettings.bulletSize}px)`,
                            minHeight: `clamp(6px, 1.2vw, ${displaySettings.bulletSize}px)`,
                            borderRadius: '50%',
                            backgroundColor: 'var(--card-bg)',
                            flexShrink: 0,
                            border: `1px solid ${event.source_color || eventColors.backgroundColor}`
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: `clamp(0.65rem, 1.3vw, ${Math.max(10, displaySettings.textSize)}px)`,
                            color: 'var(--text)',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            lineHeight: 1.2,
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}
                        >
                          {event.title}
                        </Typography>
                      </Box>
                    ))}
                    {dayEvents.length > 2 && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: `clamp(0.65rem, 1.2vw, ${Math.max(10, displaySettings.textSize)}px)`, 
                          color: 'var(--text-secondary)',
                          textAlign: 'center',
                          py: 0.5,
                          fontWeight: 500
                        }}
                      >
                        +{dayEvents.length - 2} more
                      </Typography>
                    )}
                  </Box>
                </Box>
              );

              day.add(1, 'day');
            }

            return days;
          })()}
            </Box>
          </Box>
        ) : viewMode === 'week' ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--spacing-sm)', flex: 1, minHeight: 0, height: '100%' }}>
            {getNext7Days().map((day, index) => (
              <Box
                key={index}
                sx={{
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--border-radius-small)',
                  p: 'clamp(4px, 0.5vw, 8px)',
                  bgcolor: day.isToday ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 1, borderBottom: '1px solid var(--card-border)', pb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: day.isToday ? 'var(--accent)' : 'inherit' }}>
                    {day.dayName}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: day.isToday ? 'var(--accent)' : 'inherit' }}>
                    {day.dayNumber}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {day.monthName}
                  </Typography>
                </Box>
                
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                  {day.events.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 2 }}>
                      No events
                    </Typography>
                  ) : (
                    day.events.map((event, eventIndex) => (
                      <Box
                        key={eventIndex}
                        onClick={() => handleSelectEvent(event)}
                        sx={{
                          p: 0.5,
                          mb: 0.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0.5,
                          minHeight: '36px',
                          '&:hover': {
                            backgroundColor: 'rgba(var(--background-rgb, 0, 0, 0), 0.05)'
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: displaySettings.bulletSize,
                            height: displaySettings.bulletSize,
                            minWidth: displaySettings.bulletSize,
                            minHeight: displaySettings.bulletSize,
                            borderRadius: '50%',
                            backgroundColor: event.source_color || eventColors.backgroundColor,
                            mt: displaySettings.bulletSize * 0.0625
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', fontSize: `${displaySettings.textSize}px` }}>
                            {moment(event.start).format('h:mm A')}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, fontSize: `${displaySettings.textSize}px` }}>
                            {event.title}
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        ) : viewMode === '3day' ? (
          // 3 Day View
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', flex: 1, minHeight: 0, height: '100%' }}>
              {Array.from({ length: 3 }, (_, index) => {
                const dayDate = moment(currentDate).add(index, 'days');
                const dayEvents = events.filter(event => {
                  if (!event.start) return false;
                  return moment(event.start).isSame(dayDate, 'day');
                });
                const isToday = dayDate.isSame(moment(), 'day');
                
                return (
                  <Box
                    key={index}
                    sx={{
                      border: '1px solid var(--card-border)',
                      borderRadius: 'var(--border-radius-medium)',
                      p: 'clamp(8px, 1vw, 12px)',
                      bgcolor: isToday ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ textAlign: 'center', mb: 1.5, borderBottom: '1px solid var(--card-border)', pb: 1 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 'bold', 
                          color: isToday ? 'var(--primary)' : 'inherit',
                          fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)',
                          display: 'block',
                          mb: 0.5
                        }}
                      >
                        {dayDate.format('dddd')}
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 'bold', 
                          color: isToday ? 'var(--primary)' : 'inherit',
                          fontSize: 'clamp(1.5rem, 3vw, 2rem)'
                        }}
                      >
                        {dayDate.format('D')}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'var(--text-secondary)',
                          fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)'
                        }}
                      >
                        {dayDate.format('MMMM YYYY')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                      {dayEvents.length === 0 ? (
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            textAlign: 'center', 
                            display: 'block', 
                            mt: 2,
                            fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)'
                          }}
                        >
                          No events
                        </Typography>
                      ) : (
                        dayEvents
                          .sort((a, b) => moment(a.start).diff(moment(b.start)))
                          .map((event, eventIndex) => (
                          <Box
                            key={eventIndex}
                            onClick={() => handleSelectEvent(event)}
                            sx={{
                              p: 1,
                              mb: 1,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1,
                              borderRadius: 'var(--border-radius-small)',
                              bgcolor: 'rgba(var(--primary-rgb), 0.05)',
                              border: '1px solid var(--card-border)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: 'rgba(var(--primary-rgb), 0.1)',
                                transform: 'translateX(2px)'
                              }
                            }}
                          >
                            <Box
                              sx={{
                                width: displaySettings.bulletSize,
                                height: displaySettings.bulletSize,
                                minWidth: displaySettings.bulletSize,
                                minHeight: displaySettings.bulletSize,
                                borderRadius: '50%',
                                backgroundColor: event.source_color || eventColors.backgroundColor,
                                mt: 0.5,
                                flexShrink: 0
                              }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontWeight: 'bold', 
                                  display: 'block', 
                                  fontSize: `clamp(0.7rem, 1.2vw, ${displaySettings.textSize}px)`,
                                  mb: 0.25
                                }}
                              >
                                {moment(event.start).format('h:mm A')}
                                {event.end && ` - ${moment(event.end).format('h:mm A')}`}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  display: 'block', 
                                  lineHeight: 1.3, 
                                  fontSize: `clamp(0.75rem, 1.3vw, ${displaySettings.textSize}px)`,
                                  fontWeight: 500
                                }}
                              >
                                {event.title}
                              </Typography>
                              {event.description && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    display: 'block', 
                                    color: 'var(--text-secondary)',
                                    fontSize: `clamp(0.65rem, 1.1vw, ${Math.max(10, displaySettings.textSize - 2)}px)`,
                                    mt: 0.25
                                  }}
                                >
                                  {event.description}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : viewMode === 'day' ? (
          // Daily View - Single day with timeline
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ 
              border: '1px solid var(--card-border)', 
              borderRadius: 'var(--border-radius-medium)',
              p: 2,
              mb: 2,
              bgcolor: moment(currentDate).isSame(moment(), 'day') ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
              flexShrink: 0
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 'bold',
                  color: moment(currentDate).isSame(moment(), 'day') ? 'var(--primary)' : 'inherit',
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.75rem)',
                  mb: 0.5
                }}
              >
                {moment(currentDate).format('dddd')}
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: 'clamp(1rem, 2vw, 1.5rem)'
                }}
              >
                {moment(currentDate).format('MMMM D, YYYY')}
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {(() => {
                const dayEvents = events
                  .filter(event => {
                    if (!event.start) return false;
                    return moment(event.start).isSame(moment(currentDate), 'day');
                  })
                  .sort((a, b) => moment(a.start).diff(moment(b.start)));
                
                // Generate hourly timeline
                const hours = Array.from({ length: 24 }, (_, i) => i);
                
                return (
                  <Box sx={{ position: 'relative' }}>
                    {hours.map((hour) => {
                      const hourEvents = dayEvents.filter(event => {
                        const eventHour = moment(event.start).hour();
                        return eventHour === hour || (eventHour < hour && moment(event.end).hour() > hour);
                      });
                      
                      return (
                        <Box
                          key={hour}
                          sx={{
                            display: 'flex',
                            borderBottom: '1px solid var(--card-border)',
                            minHeight: 60,
                            position: 'relative'
                          }}
                        >
                          <Box sx={{ 
                            width: 80, 
                            flexShrink: 0, 
                            p: 1,
                            borderRight: '1px solid var(--card-border)',
                            textAlign: 'right'
                          }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'var(--text-secondary)',
                                fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)'
                              }}
                            >
                              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, p: 1, position: 'relative' }}>
                            {hourEvents.map((event, eventIndex) => {
                              const eventStart = moment(event.start);
                              const eventEnd = moment(event.end || event.start);
                              const eventHour = eventStart.hour();
                              const eventMinute = eventStart.minute();
                              const duration = eventEnd.diff(eventStart, 'minutes');
                              const topOffset = eventHour === hour ? (eventMinute / 60) * 60 : 0;
                              const height = Math.max(40, (duration / 60) * 60);
                              
                              return (
                                <Box
                                  key={eventIndex}
                                  onClick={() => handleSelectEvent(event)}
                                  sx={{
                                    position: 'absolute',
                                    top: `${topOffset}px`,
                                    left: `${eventIndex * 5}%`,
                                    width: '90%',
                                    minHeight: `${height}px`,
                                    p: 1,
                                    borderRadius: 'var(--border-radius-small)',
                                    bgcolor: event.source_color || eventColors.backgroundColor,
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--elevation-1)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      transform: 'scale(1.02)',
                                      boxShadow: 'var(--elevation-2)'
                                    },
                                    zIndex: 1
                                  }}
                                >
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontWeight: 'bold',
                                      display: 'block',
                                      fontSize: `clamp(0.7rem, 1.2vw, ${displaySettings.textSize}px)`,
                                      mb: 0.25
                                    }}
                                  >
                                    {eventStart.format('h:mm A')}
                                    {eventEnd && ` - ${eventEnd.format('h:mm A')}`}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 500,
                                      fontSize: `clamp(0.75rem, 1.3vw, ${displaySettings.textSize}px)`,
                                      lineHeight: 1.2
                                    }}
                                  >
                                    {event.title}
                                  </Typography>
                                  {event.description && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        display: 'block',
                                        fontSize: `clamp(0.65rem, 1.1vw, ${Math.max(10, displaySettings.textSize - 2)}px)`,
                                        mt: 0.25,
                                        opacity: 0.9
                                      }}
                                    >
                                      {event.description}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                );
              })()}
            </Box>
          </Box>
        ) : null}
      </Box>

      </Card>

      {/* Day Events Modal Dialog */}
      <Dialog 
        open={showDayModal} 
        onClose={() => setShowDayModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text)',
            border: '1px solid var(--card-border)',
          }
        }}
      >
        <DialogTitle sx={{ color: 'var(--text)' }}>
          {selectedDate && (
            <Typography variant="h6" component="span" sx={{ color: 'var(--text)' }}>
              📅 {moment(selectedDate).format('dddd, MMMM D, YYYY')}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ color: 'var(--text)' }}>
          {selectedDateEvents.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
              No events scheduled for this day.
            </Typography>
          ) : (
            <List>
              {selectedDateEvents.map((event, index) => (
                <ListItem
                  key={event.id || index}
                  sx={{
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--border-radius-small)',
                    mb: 1,
                    bgcolor: 'rgba(var(--accent-rgb), 0.05)',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    p: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, width: '100%' }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: event.source_color || eventColors.backgroundColor,
                        flexShrink: 0
                      }}
                    />
                    <Chip 
                      label={event.source_name || 'Unknown Calendar'} 
                      size="small"
                      sx={{
                        backgroundColor: event.source_color || eventColors.backgroundColor,
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {event.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          🕐 {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
                        </Typography>
                        {event.location && (
                          <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            📍 {event.location}
                          </Typography>
                        )}
                        {event.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {event.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDayModal(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings are now managed in Admin Panel */}

      {/* Event Add/Edit Dialog */}
      <Dialog
        open={showEventDialog}
        onClose={() => setShowEventDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEvent ? 'Edit Event' : 'Add Event'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Event Title"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              sx={{ mb: 2 }}
              required
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Calendar</InputLabel>
              <Select
                value={eventForm.calendar_id || ''}
                label="Calendar"
                onChange={(e) => setEventForm({ ...eventForm, calendar_id: e.target.value })}
                required
              >
                {calendarSources.filter(c => c.enabled === 1).map((calendar) => (
                  <MenuItem key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Start Date & Time"
              type="datetime-local"
              value={eventForm.start}
              onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              fullWidth
              label="End Date & Time"
              type="datetime-local"
              value={eventForm.end}
              onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              fullWidth
              label="Location"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Description"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              multiline
              rows={4}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {editingEvent && (
            <Button
              onClick={handleDeleteEvent}
              color="error"
              sx={{ mr: 'auto' }}
            >
              Delete
            </Button>
          )}
          <Button onClick={() => setShowEventDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEvent}
            disabled={savingEvent || !eventForm.title || !eventForm.start || !eventForm.calendar_id}
          >
            {savingEvent ? 'Saving...' : editingEvent ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};

export default CalendarWidget;
