import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  Avatar
} from '@mui/material';
import { TrendingUp, TrendingDown, Circle } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import moment from 'moment';

const MarbleChartWidget = ({ transparentBackground }) => {
  const [marbles, setMarbles] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ daily_increment: 3 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    fetchMarbles();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchHistory(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.marbles?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchMarbles();
        if (selectedUserId) {
          fetchHistory(selectedUserId);
        }
      }, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [selectedUserId]);

  const fetchMarbles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${getApiUrl()}/api/marbles`);
      const marblesData = Array.isArray(response.data) ? response.data : [];
      setMarbles(marblesData);
      if (marblesData.length > 0 && !selectedUserId) {
        setSelectedUserId(marblesData[0].user_id);
      }
    } catch (error) {
      console.error('Error fetching marbles:', error);
      setError('Failed to fetch marbles.');
      setMarbles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (userId) => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/marbles/${userId}/history`, {
        params: { limit: 30 }
      });
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching marble history:', error);
      setHistory([]);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/marbles/settings`);
      setSettings(response.data || { daily_increment: 3 });
    } catch (error) {
      console.error('Error fetching marble settings:', error);
    }
  };

  const getChartData = () => {
    if (!history || history.length === 0) return [];

    // Group by date and calculate running total
    const dateMap = new Map();
    let runningTotal = 0;

    // Get initial count from marbles
    const userMarble = marbles.find(m => m.user_id === selectedUserId);
    if (userMarble) {
      runningTotal = userMarble.count;
    }

    // Work backwards from most recent
    const sortedHistory = [...history].reverse();
    sortedHistory.forEach(entry => {
      runningTotal -= entry.change_amount; // Subtract to get previous total
    });

    // Now build forward
    const chartData = [];
    sortedHistory.forEach(entry => {
      runningTotal += entry.change_amount;
      const date = moment(entry.created_at).format('MMM D');
      chartData.push({
        date,
        marbles: runningTotal,
        change: entry.change_amount
      });
    });

    return chartData.reverse();
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
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
        borderBottom: '2px solid var(--secondary)',
        background: 'linear-gradient(135deg, var(--secondary) 0%, transparent 100%)',
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
          Marble Chart
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mt: 0.5, display: 'block' }}>
          Daily increment: {settings.daily_increment} marbles
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : marbles.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No users found
          </Typography>
        ) : (
          <>
            {/* User List */}
            <List sx={{ mb: 2 }}>
              {marbles.map((marble) => (
                <ListItem
                  key={marble.user_id}
                  onClick={() => setSelectedUserId(marble.user_id)}
                  sx={{
                    border: '1px solid var(--card-border)',
                    borderLeft: '3px solid var(--secondary)',
                    borderRadius: 'var(--border-radius-small)',
                    mb: 1,
                    backgroundColor: selectedUserId === marble.user_id ? 'var(--surface)' : 'var(--card-bg)',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'var(--surface)',
                      transform: 'translateX(2px)',
                      boxShadow: 'var(--elevation-1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: 'var(--secondary)',
                      color: 'var(--text)',
                      mr: 2,
                      width: 40,
                      height: 40
                    }}
                  >
                    {getInitials(marble.username)}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'var(--text)' }}>
                          {marble.username || `User ${marble.user_id}`}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Circle sx={{ fontSize: 12, color: 'var(--secondary)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                          {marble.count} marbles
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {/* History Chart */}
            {selectedUserId && history.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--text)', fontWeight: 'bold' }}>
                  Marble History
                </Typography>
                <Box sx={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '0.75rem' }}
                      />
                      <YAxis 
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '0.75rem' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--border-radius-small)',
                          color: 'var(--text)'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="marbles"
                        stroke="var(--secondary)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--secondary)', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}

            {/* Recent History List */}
            {selectedUserId && history.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--text)', fontWeight: 'bold' }}>
                  Recent Changes
                </Typography>
                <List>
                  {history.slice(0, 5).map((entry) => (
                    <ListItem
                      key={entry.id}
                      sx={{
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--border-radius-small)',
                        mb: 0.5,
                        backgroundColor: 'var(--card-bg)',
                        py: 0.5
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {entry.change_amount > 0 ? (
                              <TrendingUp sx={{ fontSize: 16, color: 'var(--success)' }} />
                            ) : (
                              <TrendingDown sx={{ fontSize: 16, color: 'var(--error)' }} />
                            )}
                            <Typography variant="body2" sx={{ color: 'var(--text)' }}>
                              {entry.change_amount > 0 ? '+' : ''}{entry.change_amount} marbles
                            </Typography>
                            <Chip
                              label={entry.change_type}
                              size="small"
                              sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                backgroundColor: entry.change_type === 'earned' ? 'var(--success)' : 'var(--error)',
                                color: 'var(--text)'
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'block' }}>
                            <Typography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block' }}>
                              {moment(entry.created_at).format('MMM D, YYYY h:mm A')}
                            </Typography>
                            {entry.reason && (
                              <Typography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mt: 0.5 }}>
                                {entry.reason}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </>
        )}
      </Box>
    </Card>
  );
};

export default MarbleChartWidget;
