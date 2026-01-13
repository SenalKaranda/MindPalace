import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add, Delete, Edit, Alarm, Notifications, VolumeUp, Visibility } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import moment from 'moment';

const AlarmWidget = ({ transparentBackground }) => {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlarmDialog, setShowAlarmDialog] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState(null);
  const [alarmForm, setAlarmForm] = useState({
    title: '',
    time: '',
    repeat_type: 'none',
    repeat_days: [],
    enabled: true,
    sound_enabled: true,
    notification_enabled: true,
    visual_alert_enabled: true
  });
  const [savingAlarm, setSavingAlarm] = useState(false);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [triggeredAlarms, setTriggeredAlarms] = useState(new Set());
  const timerRefs = useRef({});

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    fetchAlarms();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.alarms?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchAlarms();
      }, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, []);

  // Set up alarm timers when alarms change
  useEffect(() => {
    // Clear all existing timers
    Object.values(timerRefs.current).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    timerRefs.current = {};

    // Set up new timers for enabled alarms
    alarms.filter(a => a.enabled).forEach(alarm => {
      const nextTime = calculateNextAlarmTime(alarm);
      if (nextTime) {
        const msUntilAlarm = nextTime.getTime() - Date.now();
        if (msUntilAlarm > 0) {
          const timer = setTimeout(() => {
            triggerAlarm(alarm);
          }, msUntilAlarm);
          timerRefs.current[alarm.id] = timer;
        }
      }
    });

    return () => {
      Object.values(timerRefs.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [alarms]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const calculateNextAlarmTime = (alarm) => {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    
    if (alarm.repeat_type === 'none') {
      // One-time alarm - check if it's today and hasn't passed, or if it's in the future
      if (today > now) {
        return today;
      }
      // If it's passed today and it's a one-time alarm, it won't fire
      return null;
    } else if (alarm.repeat_type === 'daily') {
      // Daily - same time every day
      if (today > now) {
        return today; // Today
      } else {
        return new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      }
    } else if (alarm.repeat_type === 'weekly') {
      // Weekly - same day of week
      const currentDay = now.getDay();
      const targetDay = 1; // Monday = 1, adjust based on your needs
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0 && today <= now) {
        daysUntil = 7; // Next week
      }
      return new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000);
    } else if (alarm.repeat_type === 'custom' && alarm.repeat_days && alarm.repeat_days.length > 0) {
      // Custom - find next matching day
      const dayMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
      const currentDay = now.getDay();
      const targetDays = alarm.repeat_days.map(d => dayMap[d]).sort((a, b) => a - b);
      
      // Find next day in this week
      for (const day of targetDays) {
        let daysUntil = (day - currentDay + 7) % 7;
        if (daysUntil === 0 && today <= now) {
          daysUntil = 7; // Next week
        }
        const candidate = new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000);
        if (candidate > now) {
          return candidate;
        }
      }
      // If no day found this week, use first day of next week
      return new Date(today.getTime() + (7 - currentDay + targetDays[0]) * 24 * 60 * 60 * 1000);
    }
    
    return null;
  };

  const triggerAlarm = async (alarm) => {
    // Update last_triggered
    try {
      await axios.put(`${getApiUrl()}/api/alarms/${alarm.id}/triggered`);
    } catch (error) {
      console.error('Error updating alarm trigger:', error);
    }

    // Show notification
    if (alarm.notification_enabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(alarm.title, {
        body: `Alarm: ${alarm.title}`,
        icon: '/favicon.ico'
      });
    }

    // Play sound
    if (alarm.sound_enabled) {
      playAlarmSound();
    }

    // Show visual alert
    if (alarm.visual_alert_enabled) {
      setTriggeredAlarms(prev => new Set([...prev, alarm.id]));
      setTimeout(() => {
        setTriggeredAlarms(prev => {
          const newSet = new Set(prev);
          newSet.delete(alarm.id);
          return newSet;
        });
      }, 5000);
    }

    // Recalculate next alarm time and set new timer
    const nextTime = calculateNextAlarmTime(alarm);
    if (nextTime && alarm.repeat_type !== 'none') {
      const msUntilAlarm = nextTime.getTime() - Date.now();
      if (msUntilAlarm > 0) {
        const timer = setTimeout(() => {
          triggerAlarm(alarm);
        }, msUntilAlarm);
        timerRefs.current[alarm.id] = timer;
      }
    } else if (alarm.repeat_type === 'none') {
      // Disable one-time alarm after firing
      try {
        await axios.post(`${getApiUrl()}/api/alarms/${alarm.id}/toggle`);
        fetchAlarms();
      } catch (error) {
        console.error('Error disabling alarm:', error);
      }
    }

    // Refresh alarms to update last_triggered
    fetchAlarms();
  };

  const playAlarmSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  };

  const fetchAlarms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${getApiUrl()}/api/alarms`);
      setAlarms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching alarms:', error);
      setError('Failed to fetch alarms.');
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlarm = () => {
    setEditingAlarm(null);
    setAlarmForm({
      title: '',
      time: moment().format('HH:mm'),
      repeat_type: 'none',
      repeat_days: [],
      enabled: true,
      sound_enabled: true,
      notification_enabled: true,
      visual_alert_enabled: true
    });
    setShowAlarmDialog(true);
  };

  const handleEditAlarm = (alarm) => {
    setEditingAlarm(alarm);
    setAlarmForm({
      title: alarm.title,
      time: alarm.time,
      repeat_type: alarm.repeat_type || 'none',
      repeat_days: alarm.repeat_days || [],
      enabled: alarm.enabled,
      sound_enabled: alarm.sound_enabled,
      notification_enabled: alarm.notification_enabled,
      visual_alert_enabled: alarm.visual_alert_enabled
    });
    setShowAlarmDialog(true);
  };

  const handleDeleteAlarm = async (alarm) => {
    if (!window.confirm(`Are you sure you want to delete "${alarm.title}"?`)) return;
    
    try {
      await axios.delete(`${getApiUrl()}/api/alarms/${alarm.id}`);
      await fetchAlarms();
    } catch (error) {
      console.error('Error deleting alarm:', error);
      alert('Failed to delete alarm. Please try again.');
    }
  };

  const handleToggleAlarm = async (alarm) => {
    try {
      await axios.post(`${getApiUrl()}/api/alarms/${alarm.id}/toggle`);
      await fetchAlarms();
    } catch (error) {
      console.error('Error toggling alarm:', error);
      alert('Failed to toggle alarm. Please try again.');
    }
  };

  const handleSaveAlarm = async () => {
    if (!alarmForm.title || !alarmForm.time) {
      alert('Please enter a title and time.');
      return;
    }

    if (alarmForm.repeat_type === 'custom' && (!alarmForm.repeat_days || alarmForm.repeat_days.length === 0)) {
      alert('Please select at least one day for custom repeat.');
      return;
    }

    setSavingAlarm(true);
    try {
      if (editingAlarm) {
        await axios.put(`${getApiUrl()}/api/alarms/${editingAlarm.id}`, alarmForm);
      } else {
        await axios.post(`${getApiUrl()}/api/alarms`, alarmForm);
      }
      await fetchAlarms();
      setShowAlarmDialog(false);
    } catch (error) {
      console.error('Error saving alarm:', error);
      alert('Failed to save alarm. Please try again.');
    } finally {
      setSavingAlarm(false);
    }
  };

  const getNextAlarmTime = (alarm) => {
    const nextTime = calculateNextAlarmTime(alarm);
    if (nextTime) {
      return moment(nextTime).format('MMM D, h:mm A');
    }
    return 'No upcoming';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: transparentBackground ? 'transparent' : 'var(--card-bg)',
        border: transparentBackground ? 'none' : '1px solid var(--card-border)',
        boxShadow: transparentBackground ? 'none' : 'var(--card-shadow)'
      }}
    >
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
            Alarms
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleAddAlarm}
            sx={{
              backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--elevation-1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                boxShadow: 'var(--elevation-2)'
              }
            }}
          >
            Add Alarm
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : alarms.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No alarms set
          </Typography>
        ) : (
          <List>
            {alarms.map((alarm) => {
              const isTriggered = triggeredAlarms.has(alarm.id);
              return (
                <ListItem
                  key={alarm.id}
                  sx={{
                    border: '1px solid var(--card-border)',
                    borderLeft: '3px solid var(--primary)',
                    borderRadius: 'var(--border-radius-small)',
                    mb: 1,
                    backgroundColor: isTriggered ? 'var(--primary)' : 'var(--card-bg)',
                    opacity: alarm.enabled ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isTriggered ? 'var(--primary)' : 'var(--surface)',
                      transform: 'translateX(2px)',
                      boxShadow: 'var(--elevation-1)'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Alarm sx={{ fontSize: 20, color: isTriggered ? 'white' : 'var(--primary)' }} />
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: isTriggered ? 'white' : 'var(--text)' }}>
                          {alarm.title}
                        </Typography>
                        {!alarm.enabled && (
                          <Chip label="Disabled" size="small" sx={{ fontSize: '0.7rem', opacity: 0.7 }} />
                        )}
                        {alarm.repeat_type !== 'none' && (
                          <Chip 
                            label={alarm.repeat_type === 'daily' ? 'Daily' : alarm.repeat_type === 'weekly' ? 'Weekly' : 'Custom'} 
                            size="small"
                            sx={{
                              borderColor: 'var(--primary)',
                              color: 'var(--primary)',
                              fontSize: '0.7rem'
                            }}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ mt: 0.5, display: 'block' }}>
                        <Typography component="span" variant="body2" sx={{ color: isTriggered ? 'rgba(var(--text-rgb), 0.9)' : 'var(--text-secondary)', display: 'block' }}>
                          Time: {moment(alarm.time, 'HH:mm').format('h:mm A')}
                        </Typography>
                        {alarm.enabled && (
                          <Typography component="span" variant="caption" sx={{ color: isTriggered ? 'rgba(var(--text-rgb), 0.8)' : 'var(--text-secondary)', display: 'block' }}>
                            Next: {getNextAlarmTime(alarm)}
                          </Typography>
                        )}
                        <Box component="span" sx={{ display: 'inline-flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          {alarm.sound_enabled && (
                            <VolumeUp sx={{ fontSize: 14, color: isTriggered ? 'white' : 'var(--text-secondary)' }} />
                          )}
                          {alarm.notification_enabled && (
                            <Notifications sx={{ fontSize: 14, color: isTriggered ? 'white' : 'var(--text-secondary)' }} />
                          )}
                          {alarm.visual_alert_enabled && (
                            <Visibility sx={{ fontSize: 14, color: isTriggered ? 'white' : 'var(--text-secondary)' }} />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleAlarm(alarm)}
                      color={alarm.enabled ? "primary" : "default"}
                    >
                      <Alarm fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditAlarm(alarm)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteAlarm(alarm)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* Alarm Add/Edit Dialog */}
      <Dialog
        open={showAlarmDialog}
        onClose={() => setShowAlarmDialog(false)}
        maxWidth="sm"
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
          {editingAlarm ? 'Edit Alarm' : 'Add Alarm'}
        </DialogTitle>
        <DialogContent sx={{ color: 'var(--text)' }}>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Alarm Title"
              value={alarmForm.title}
              onChange={(e) => setAlarmForm({ ...alarmForm, title: e.target.value })}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Time"
              type="time"
              value={alarmForm.time}
              onChange={(e) => setAlarmForm({ ...alarmForm, time: e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              required
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Repeat</InputLabel>
              <Select
                value={alarmForm.repeat_type}
                label="Repeat"
                onChange={(e) => setAlarmForm({ ...alarmForm, repeat_type: e.target.value, repeat_days: e.target.value !== 'custom' ? [] : alarmForm.repeat_days })}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>

            {alarmForm.repeat_type === 'custom' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Days</InputLabel>
                <Select
                  multiple
                  value={alarmForm.repeat_days}
                  label="Days"
                  onChange={(e) => setAlarmForm({ ...alarmForm, repeat_days: e.target.value })}
                  renderValue={(selected) => selected.map(val => daysOfWeek.find(d => d.value === val)?.label).join(', ')}
                >
                  {daysOfWeek.map((day) => (
                    <MenuItem key={day.value} value={day.value}>
                      {day.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={alarmForm.enabled}
                    onChange={(e) => setAlarmForm({ ...alarmForm, enabled: e.target.checked })}
                  />
                }
                label="Enabled"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={alarmForm.sound_enabled}
                    onChange={(e) => setAlarmForm({ ...alarmForm, sound_enabled: e.target.checked })}
                  />
                }
                label="Sound"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={alarmForm.notification_enabled}
                    onChange={(e) => setAlarmForm({ ...alarmForm, notification_enabled: e.target.checked })}
                  />
                }
                label="Browser Notification"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={alarmForm.visual_alert_enabled}
                    onChange={(e) => setAlarmForm({ ...alarmForm, visual_alert_enabled: e.target.checked })}
                  />
                }
                label="Visual Alert"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowAlarmDialog(false)}
            sx={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAlarm}
            disabled={savingAlarm || !alarmForm.title || !alarmForm.time}
            sx={{
              backgroundColor: 'var(--primary)',
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--primary)',
                opacity: 0.9
              },
              '&:disabled': {
                backgroundColor: 'var(--text-secondary)',
                opacity: 0.5
              }
            }}
          >
            {savingAlarm ? 'Saving...' : editingAlarm ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AlarmWidget;
