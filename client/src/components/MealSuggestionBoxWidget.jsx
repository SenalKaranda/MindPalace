import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Avatar,
  Chip
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import moment from 'moment';

const MealSuggestionBoxWidget = ({ transparentBackground }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [suggestionText, setSuggestionText] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('mealSuggestionBoxAuthenticated') === 'true';
  });
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchSuggestions();
  }, []);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.mealSuggestionBox?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchSuggestions();
      }, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/users`);
      setUsers(Array.isArray(response.data) ? response.data.filter(u => u.id !== 0) : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${getApiUrl()}/api/meal-suggestions`);
      setSuggestions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setError('Failed to fetch suggestions.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const verifyPin = async (pin) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/admin/verify-pin`, { pin });
      if (response.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('mealSuggestionBoxAuthenticated', 'true');
        localStorage.setItem('adminPin', pin);
        setShowPinDialog(false);
        setPinInput('');
        setPinError('');
        return true;
      }
    } catch (error) {
      setPinError('Invalid PIN. Please try again.');
      return false;
    }
    return false;
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    await verifyPin(pinInput);
  };

  const handleSubmitSuggestion = async () => {
    if (!selectedUser || !suggestionText.trim()) {
      alert('Please select a user and enter a suggestion');
      return;
    }
    try {
      await axios.post(`${getApiUrl()}/api/meal-suggestions`, {
        user_id: selectedUser,
        suggestion_text: suggestionText
      });
      setSuggestionText('');
      fetchSuggestions();
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      alert('Failed to submit suggestion');
    }
  };

  const handleDeleteSuggestion = async (suggestionId) => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    if (!window.confirm('Delete this suggestion?')) return;
    
    try {
      await axios.delete(
        `${getApiUrl()}/api/meal-suggestions/${suggestionId}`,
        { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
      );
      fetchSuggestions();
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      alert('Failed to delete suggestion');
    }
  };


  const renderUserAvatar = (user) => {
    const handleImageError = (e) => {
      e.target.style.display = 'none';
      e.target.nextSibling.style.display = 'flex';
    };

    let imageUrl = null;
    if (user.profile_picture) {
      if (user.profile_picture.startsWith('data:')) {
        imageUrl = user.profile_picture;
      } else {
        imageUrl = `${getApiUrl()}/Uploads/users/${user.profile_picture}`;
      }
    }

    return (
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={user.username}
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--accent)',
                display: 'block'
              }}
              onError={handleImageError}
            />
            <Avatar
              sx={{
                width: 50,
                height: 50,
                bgcolor: 'var(--accent)',
                border: '2px solid var(--accent)',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                display: 'none'
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
          </>
        ) : (
          <Avatar
            sx={{
              width: 50,
              height: 50,
              bgcolor: 'var(--accent)',
              border: '2px solid var(--accent)',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
        )}
      </Box>
    );
  };

  const getUserById = (userId) => {
    return users.find(u => u.id === userId);
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
          borderBottom: '2px solid var(--accent)',
          background: 'linear-gradient(135deg, var(--accent) 0%, transparent 100%)',
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
            💡 Meal Suggestions
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
          <Typography>Loading suggestions...</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <>
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
          borderBottom: '2px solid var(--accent)',
          background: 'linear-gradient(135deg, var(--accent) 0%, transparent 100%)',
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
            💡 Meal Suggestions
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row', p: 2, gap: 2 }}>
          {error && (
            <Box sx={{ 
              position: 'absolute',
              top: 70,
              left: '50%',
              transform: 'translateX(-50%)',
              mb: 2, 
              p: 2, 
              bgcolor: 'rgba(255, 0, 0, 0.1)', 
              borderRadius: 'var(--border-radius-small)', 
              flexShrink: 0,
              zIndex: 10
            }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}

          {/* Left Side - User Selection and Input */}
          <Box sx={{ 
            flex: '1 1 50%', 
            display: 'flex', 
            flexDirection: 'column',
            borderRight: '1px solid var(--card-border)',
            pr: 2,
            minWidth: 0
          }}>
            <Typography variant="body2" sx={{ mb: 1.5, color: 'var(--text-secondary)', fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)' }}>
              Select User & Add Suggestion
            </Typography>
            
            {/* User Selection */}
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1.5, 
              justifyContent: 'center',
              alignItems: 'center',
              mb: 2
            }}>
              {users.map(user => {
                const isSelected = selectedUser === user.id;
                
                return (
                  <Box
                    key={user.id}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedUser(user.id)}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        border: isSelected ? '3px solid var(--accent)' : '2px solid var(--card-border)',
                        borderRadius: '50%',
                        p: 0.5,
                        bgcolor: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'var(--accent)',
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      {renderUserAvatar(user)}
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        mt: 0.5, 
                        fontSize: 'clamp(0.7rem, 1.1vw, 0.8rem)',
                        textAlign: 'center',
                        maxWidth: 70,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {user.username}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Suggestion Input */}
            <TextField
              fullWidth
              label="Meal Suggestion"
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              multiline
              rows={4}
              placeholder="Enter your meal suggestion here..."
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleSubmitSuggestion}
              disabled={!selectedUser || !suggestionText.trim()}
              fullWidth
              sx={{ 
                bgcolor: 'var(--accent)',
                '&:hover': {
                  bgcolor: 'var(--accent)',
                  opacity: 0.9
                }
              }}
            >
              Submit Suggestion
            </Button>
          </Box>

          {/* Right Side - Suggestions List */}
          <Box sx={{ 
            flex: '1 1 50%', 
            display: 'flex', 
            flexDirection: 'column',
            pl: 2,
            minWidth: 0
          }}>
            <Typography variant="body2" sx={{ mb: 1.5, color: 'var(--text-secondary)', fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)' }}>
              Recent Suggestions
            </Typography>
            
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {suggestions.length === 0 ? (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    textAlign: 'center', 
                    py: 2,
                    fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)'
                  }}
                >
                  No suggestions yet
                </Typography>
              ) : (
                suggestions.map((suggestion) => {
                  const user = getUserById(suggestion.user_id);
                  return (
                    <Box
                      key={suggestion.id}
                      sx={{
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--border-radius-medium)',
                        p: 1.5,
                        mb: 1.5,
                        bgcolor: 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(0, 0, 0, 0.05)',
                          transform: 'translateY(-2px)',
                          boxShadow: 'var(--elevation-1)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                        {user && renderUserAvatar(user)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)' }}>
                            {user ? user.username : 'Unknown User'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.65rem, 1vw, 0.75rem)' }}>
                            {moment(suggestion.created_at).format('MMM D, YYYY h:mm A')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSuggestion(suggestion.id)}
                            sx={{ color: 'var(--error)' }}
                            title="Delete"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)', lineHeight: 1.4 }}>
                        {suggestion.suggestion_text}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      {/* PIN Dialog */}
      <Dialog
        open={showPinDialog}
        onClose={() => {}}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Admin PIN Required</DialogTitle>
        <form onSubmit={handlePinSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Enter Admin PIN"
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError('');
              }}
              error={!!pinError}
              helperText={pinError}
              autoFocus
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              type="submit"
              variant="contained"
              disabled={!pinInput}
              sx={{
                bgcolor: 'var(--accent)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'var(--accent)',
                  opacity: 0.9
                }
              }}
            >
              Verify
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default MealSuggestionBoxWidget;
