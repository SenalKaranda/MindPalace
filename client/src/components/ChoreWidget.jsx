import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api.js';
import {
  Typography,
  Button,
  Box,
  Avatar,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Backdrop,
  CircularProgress,
  Card
} from '@mui/material';
import { Edit, Save, Cancel, Add, Delete, Check, Undo } from '@mui/icons-material';
import axios from 'axios';

const ChoreWidget = ({ transparentBackground }) => {
  const [users, setUsers] = useState([]);
  const [chores, setChores] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [editingChore, setEditingChore] = useState(null);
  const [newChore, setNewChore] = useState({
    user_id: '',
    title: '',
    description: '',
    time_period: 'any-time',
    assigned_days_of_week: ['monday'],
    repeat_type: 'weekly',
    clam_value: 0
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBonusChores, setShowBonusChores] = useState(() => {
    const saved = localStorage.getItem('showBonusChores');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // PIN Authentication for Add Chore
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('choreWidgetAuthenticated') === 'true';
  });
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Prize Spinner states
  const [selectedUserForPrize, setSelectedUserForPrize] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [spinnerAngle, setSpinnerAngle] = useState(0);
  const [prizeMinimumShells, setPrizeMinimumShells] = useState(0);

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const timePeriods = ['morning', 'afternoon', 'evening', 'any-time'];
  const repeatTypes = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'daily', label: 'Daily' },
    { value: 'until-completed', label: 'Until Completed' },
    { value: 'no-repeat', label: 'No Repeat' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchChores();
    fetchPrizes();
    fetchPrizeMinimumShells();
  }, []);

  const fetchPrizeMinimumShells = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings/PRIZE_MINIMUM_SHELLS`);
      setPrizeMinimumShells(response.data.value || 0);
    } catch (error) {
      console.error('Error fetching minimum shells setting:', error);
      setPrizeMinimumShells(0);
    }
  };

  // PIN Authentication functions
  const verifyPin = async (pin) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/admin/verify-pin`, { pin });
      if (response.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('choreWidgetAuthenticated', 'true');
        localStorage.setItem('adminPin', pin); // Store PIN for API requests
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

  const handleAddChoreClick = () => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    setShowAddDialog(true);
  };

  // Save showBonusChores preference to localStorage
  useEffect(() => {
    localStorage.setItem('showBonusChores', JSON.stringify(showBonusChores));
  }, [showBonusChores]);

  // Auto-refresh functionality
  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.chore?.refreshInterval || 0;

    if (refreshInterval > 0) {
      console.log(`ChoreWidget: Auto-refresh enabled (${refreshInterval}ms)`);
      
      const intervalId = setInterval(() => {
        console.log('ChoreWidget: Auto-refreshing data...');
        fetchUsers();
        fetchChores();
        fetchPrizes();
      }, refreshInterval);

      return () => {
        console.log('ChoreWidget: Clearing auto-refresh interval');
        clearInterval(intervalId);
      };
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/users`);
      // Ensure response.data is an array before filtering
      if (Array.isArray(response.data)) {
        setUsers(response.data.filter(user => user.id !== 0));
      } else {
        console.error('Invalid users response:', response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchChores = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/chores`);
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setChores(response.data);
      } else {
        console.error('Invalid chores response:', response.data);
        setChores([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chores:', error);
      setChores([]);
      setLoading(false);
    }
  };

  const fetchPrizes = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/prizes`);
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setPrizes(response.data);
      } else {
        console.error('Invalid prizes response:', response.data);
        setPrizes([]);
      }
    } catch (error) {
      console.error('Error fetching prizes:', error);
      setPrizes([]);
    }
  };

  const toggleChoreCompletion = async (choreId, currentStatus) => {
    try {
      setIsLoading(true);
      await axios.patch(`${getApiUrl()}/api/chores/${choreId}`, {
        completed: !currentStatus
      });
      fetchChores();
      fetchUsers();
    } catch (error) {
      console.error('Error updating chore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignBonusChore = async (choreId, userId) => {
    try {
      setIsLoading(true);
      await axios.patch(`${getApiUrl()}/api/chores/${choreId}/assign`, {
        user_id: userId
      });
      fetchChores();
    } catch (error) {
      console.error('Error assigning bonus chore:', error);
      alert(error.response?.data?.error || 'Failed to assign bonus chore');
    } finally {
      setIsLoading(false);
    }
  };

  const saveChore = async () => {
    try {
      setIsLoading(true);
      if (editingChore) {
        await axios.patch(`${getApiUrl()}/api/chores/${editingChore.id}`, editingChore);
      } else {
        for (const day of newChore.assigned_days_of_week) {
          const choreForDay = {
            ...newChore,
            assigned_day_of_week: day
          };
          await axios.post(`${getApiUrl()}/api/chores`, choreForDay);
        }
        setNewChore({
          user_id: '',
          title: '',
          description: '',
          time_period: 'any-time',
          assigned_days_of_week: ['monday'],
          repeat_type: 'weekly',
          clam_value: 0
        });
        setShowAddDialog(false);
      }
      setEditingChore(null);
      fetchChores();
    } catch (error) {
      console.error('Error saving chore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentDay = () => {
    return daysOfWeek[new Date().getDay()];
  };

  const getUserChores = (userId, dayOfWeek = null) => {
    return chores.filter(chore => 
      chore.user_id === userId && 
      (dayOfWeek ? chore.assigned_day_of_week === dayOfWeek : true)
    );
  };

  const getBonusChores = () => {
    return chores.filter(chore => chore.clam_value > 0);
  };

  const getAvailableBonusChores = () => {
    return getBonusChores().filter(chore => chore.user_id === 0);
  };

  const getAssignedBonusChores = () => {
    return getBonusChores().filter(chore => chore.user_id !== 0);
  };

  const getAffordablePrizes = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    return prizes.filter(prize => user.clam_total >= prize.clam_cost);
  };

  const canUserSpin = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    return user.clam_total >= prizeMinimumShells && getAffordablePrizes(userId).length > 0;
  };

  const spinPrizeWheel = async () => {
    if (!selectedUserForPrize || !canUserSpin(selectedUserForPrize)) {
      return;
    }

    const affordablePrizes = getAffordablePrizes(selectedUserForPrize);
    if (affordablePrizes.length === 0) {
      alert('No affordable prizes available for this user');
      return;
    }

    setSpinning(true);
    setSelectedPrize(null);

    // Randomly select a prize
    const randomPrize = affordablePrizes[Math.floor(Math.random() * affordablePrizes.length)];
    
    // Calculate rotation angle (multiple full rotations + prize position)
    const prizeIndex = affordablePrizes.findIndex(p => p.id === randomPrize.id);
    const prizeAngle = (360 / affordablePrizes.length) * prizeIndex;
    const fullRotations = 5; // 5 full rotations
    const finalAngle = fullRotations * 360 + (360 - prizeAngle) + spinnerAngle;

    // Animate spinner
    setSpinnerAngle(finalAngle);

    // Wait for animation to complete (4 seconds)
    setTimeout(async () => {
      try {
        // Call API to deduct shells
        const response = await axios.post(`${getApiUrl()}/api/prizes/select`, {
          user_id: selectedUserForPrize,
          prize_id: randomPrize.id
        });

        setSelectedPrize(randomPrize);
        fetchUsers(); // Refresh user balance
        
        // Reset after showing result
        setTimeout(() => {
          setSelectedPrize(null);
          setSpinnerAngle(0);
        }, 3000);
      } catch (error) {
        console.error('Error selecting prize:', error);
        alert(error.response?.data?.error || 'Failed to select prize');
        setSpinnerAngle(0);
      } finally {
        setSpinning(false);
      }
    }, 4000);
  };

  const renderUserAvatar = (user) => {
    const handleImageError = (e) => {
      console.log(`Profile picture failed to load for user ${user.username}:`, user.profile_picture);
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
                width: 60,
                height: 60,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--accent)',
                display: 'block'
              }}
              onError={handleImageError}
            />
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'var(--accent)',
                border: '3px solid var(--accent)',
                fontSize: '1.5rem',
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
              width: 60,
              height: 60,
              bgcolor: 'var(--accent)',
              border: '3px solid var(--accent)',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
        )}
        
        <Chip
          label={`${user.clam_total || 0} 🥟`}
          size="small"
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            bgcolor: 'var(--accent)',
            color: 'white',
            fontSize: '0.7rem',
            height: 24,
            '& .MuiChip-label': {
              px: 1
            }
          }}
        />
      </Box>
    );
  };

  const renderChoreItem = (chore, isEditing = false) => {
    return (
      <Box
        key={chore.id}
        sx={{
          p: 1.5,
          border: '1px solid var(--card-border)',
          borderRadius: 2,
          mb: 1,
          bgcolor: chore.completed ? 'rgba(0, 255, 0, 0.1)' : 'transparent',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: chore.completed ? 'normal' : 'bold', fontSize: '0.85rem' }}>
            {chore.title}
            {chore.clam_value > 0 && (
              <Chip
                label={`${chore.clam_value} 🥟`}
                size="small"
                sx={{ ml: 1, bgcolor: 'var(--accent)', color: 'white' }}
              />
            )}
          </Typography>
          {chore.description && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {chore.description}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {chore.time_period.replace('-', ' ')} • {repeatTypes.find(t => t.value === chore.repeat_type)?.label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            color={chore.completed ? "secondary" : "primary"}
            onClick={() => toggleChoreCompletion(chore.id, chore.completed)}
            size="small"
            sx={{ 
              minWidth: 'auto',
              width: 32,
              height: 32,
              bgcolor: chore.completed ? 'transparent' : 'var(--accent)',
              color: chore.completed ? 'var(--accent)' : 'white',
              '&:hover': {
                bgcolor: chore.completed ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--accent)',
                filter: 'brightness(1.1)'
              }
            }}
          >
            {chore.completed ? <Undo fontSize="small" /> : <Check fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
    );
  };

  const handleDayToggle = (day) => {
    setNewChore(prev => ({
      ...prev,
      assigned_days_of_week: prev.assigned_days_of_week.includes(day)
        ? prev.assigned_days_of_week.filter(d => d !== day)
        : [...prev.assigned_days_of_week, day]
    }));
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
            🧹 Chores
          </Typography>
        </Box>
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2
        }}>
          <Typography variant="h6">Loading chores...</Typography>
        </Box>
      </Card>
    );
  }

  const currentDay = getCurrentDay();
  const availableBonusChores = getAvailableBonusChores();
  const assignedBonusChores = getAssignedBonusChores();

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">🥟 Daily Chores</Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}> {/* Increased from gap: 1 */}
            <Button
              onClick={() => setShowBonusChores(!showBonusChores)}
              variant={showBonusChores ? "contained" : "outlined"}
              size="small"
              sx={{ minWidth: 'auto', px: 1 }}
              title={showBonusChores ? "Hide Bonus Chores" : "Show Bonus Chores"}
            >
              🥟
            </Button>
            <Button
              startIcon={<Add />}
              onClick={handleAddChoreClick}
              variant="contained"
              size="small"
            >
              Add Chore
            </Button>
          </Box>
        </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Row 1: User Chores Section - Top Third */}
          <Box sx={{ flex: '1 1 33.33%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              display: 'flex',
              gap: 'var(--spacing-md)',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              width: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              pb: 2
            }}>
            {users.filter(user => user.id !== 0).map(user => {
              const userChores = getUserChores(user.id, currentDay);
              const completedChores = userChores.filter(c => c.completed && c.clam_value === 0).length;
              const totalRegularChores = userChores.filter(c => c.clam_value === 0).length;
              const allRegularChoresCompleted = totalRegularChores > 0 && completedChores === totalRegularChores;

              return (
                <Box
                  key={user.id}
                  sx={{
                    flex: '1 1 0',
                    minWidth: '180px',
                    maxWidth: '250px',
                    border: '2px solid var(--card-border)',
                    borderRadius: 'var(--border-radius-medium)',
                    p: 2,
                    bgcolor: allRegularChoresCompleted ? 'rgba(0, 255, 0, 0.05)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2.5 }}>
                    {renderUserAvatar(user)}
                    <Typography variant="subtitle1" sx={{ mt: 1, fontSize: '0.9rem', fontWeight: 'bold' }}>
                      {user.username}
                    </Typography>
                    {allRegularChoresCompleted && (
                      <Chip
                        label="All Done! +2 🥟"
                        color="success"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>

                  <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {userChores.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                        No chores for today
                      </Typography>
                    ) : (
                      userChores.map(chore => renderChoreItem(chore, false))
                    )}
                  </Box>
                </Box>
              );
            })}

            </Box>
          </Box>

          {/* Row 2: Bonus Chores Section - Middle Third */}
          {showBonusChores && (
            <Box sx={{ 
              flex: '1 1 33.33%', 
              minHeight: 0, 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              borderTop: '2px solid var(--accent)',
              pt: 2,
              mt: 2
            }}>
              <Typography variant="subtitle1" sx={{ 
                textAlign: 'center', 
                mb: 2, 
                color: 'var(--accent)', 
                fontSize: '0.9rem', 
                fontWeight: 'bold' 
              }}>
                🥟 Bonus Chores
              </Typography>
              
              {availableBonusChores.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No bonus chores available
                </Typography>
              ) : (
                <Box sx={{ 
                  flex: 1, 
                  minHeight: 0, 
                  overflow: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(200px, 25%, 300px), 1fr))',
                  gap: 'var(--spacing-md)',
                  pb: 2
                }}>
                  {availableBonusChores.map(chore => (
                    <Box
                      key={chore.id}
                      sx={{
                        p: 2,
                        border: '1px solid var(--accent)',
                        borderLeft: '3px solid var(--accent)',
                        borderRadius: 'var(--border-radius-small)',
                        bgcolor: 'rgba(var(--accent-rgb), 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                          borderLeftColor: 'var(--accent)',
                          transform: 'translateX(2px)',
                          boxShadow: 'var(--elevation-1)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1 }}>
                          {chore.title}
                        </Typography>
                        <Chip
                          label={`${chore.clam_value} 🥟`}
                          size="small"
                          sx={{ 
                            bgcolor: 'var(--accent)', 
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                      {chore.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.875rem' }}>
                          {chore.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
                        {users.map(user => (
                          <Button
                            key={user.id}
                            size="small"
                            variant="outlined"
                            onClick={() => assignBonusChore(chore.id, user.id)}
                            sx={{ 
                              fontSize: '0.75rem', 
                              minWidth: 'auto', 
                              px: 1.5,
                              borderColor: 'var(--accent)',
                              color: 'var(--accent)',
                              '&:hover': {
                                bgcolor: 'var(--accent)',
                                color: 'white'
                              }
                            }}
                          >
                            {user.username}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Row 3: Prizes Section - Bottom Third */}
          <Box sx={{ 
            flex: '1 1 33.33%', 
            minHeight: 0, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            borderTop: '2px solid var(--accent)',
            pt: 2,
            mt: 2
          }}>
            <Typography variant="subtitle1" sx={{ 
              textAlign: 'center', 
              mb: 2, 
              color: 'var(--accent)', 
              fontSize: '0.9rem', 
              fontWeight: 'bold' 
            }}>
              🛍️ Prize Spinner
            </Typography>
            <Box sx={{ 
              flex: 1, 
              minHeight: 0, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pb: 2,
              px: 2
            }}>
              {selectedPrize ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ mb: 2, color: 'var(--accent)', fontWeight: 'bold' }}>
                    🎉 Congratulations! 🎉
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {selectedPrize.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cost: {selectedPrize.clam_cost} 🥟
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* User Selection - Circular Buttons */}
                  <Box sx={{ mb: 2, width: '100%', maxWidth: 400 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Select User to Spin
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1.5, 
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {users.filter(user => user.id !== 0).map(user => {
                        const affordableCount = getAffordablePrizes(user.id).length;
                        const canSpin = canUserSpin(user.id);
                        const isSelected = selectedUserForPrize === user.id;
                        
                        // Render smaller avatar for prize spinner
                        const renderSmallAvatar = (user) => {
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
                        
                        return (
                          <Box
                            key={user.id}
                            sx={{
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              cursor: canSpin ? 'pointer' : 'not-allowed',
                              opacity: canSpin ? 1 : 0.5
                            }}
                            onClick={() => canSpin && setSelectedUserForPrize(user.id)}
                          >
                            <Box
                              sx={{
                                position: 'relative',
                                border: isSelected ? '3px solid var(--accent)' : '2px solid var(--card-border)',
                                borderRadius: '50%',
                                p: 0.5,
                                bgcolor: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                transition: 'all 0.2s ease',
                                '&:hover': canSpin ? {
                                  borderColor: 'var(--accent)',
                                  transform: 'scale(1.05)'
                                } : {}
                              }}
                            >
                              {renderSmallAvatar(user)}
                            </Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                mt: 0.5, 
                                fontSize: '0.7rem',
                                textAlign: 'center',
                                maxWidth: 70,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {user.username}
                            </Typography>
                            <Chip
                              label={`${user.clam_total || 0} 🥟`}
                              size="small"
                              sx={{
                                mt: 0.5,
                                fontSize: '0.65rem',
                                height: 20,
                                bgcolor: canSpin ? 'var(--accent)' : 'var(--card-border)',
                                color: canSpin ? 'white' : 'var(--text-secondary)'
                              }}
                            />
                            {!canSpin && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  mt: 0.5,
                                  fontSize: '0.6rem',
                                  color: 'var(--text-secondary)',
                                  textAlign: 'center',
                                  maxWidth: 80
                                }}
                              >
                                {affordableCount === 0 ? 'No prizes' : `Need ${prizeMinimumShells}`}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  {selectedUserForPrize && (
                    <>
                      {getAffordablePrizes(selectedUserForPrize).length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                          No affordable prizes for this user
                        </Typography>
                      ) : (
                        <>
                          {/* Spinner Wheel */}
                          <Box sx={{ 
                            position: 'relative', 
                            width: 200, 
                            height: 200, 
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Box
                              sx={{
                                position: 'relative',
                                width: 200,
                                height: 200,
                                borderRadius: '50%',
                                border: '4px solid var(--accent)',
                                overflow: 'hidden',
                                transform: `rotate(${spinnerAngle}deg)`,
                                transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                                bgcolor: 'var(--card-bg)'
                              }}
                            >
                              {getAffordablePrizes(selectedUserForPrize).map((prize, index) => {
                                const totalPrizes = getAffordablePrizes(selectedUserForPrize).length;
                                const angle = (360 / totalPrizes) * index;
                                const prizeAngle = (360 / totalPrizes);
                                const centerAngle = angle + (prizeAngle / 2);
                                return (
                                  <Box
                                    key={prize.id}
                                    sx={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      width: '50%',
                                      height: '50%',
                                      transformOrigin: '0 0',
                                      transform: `rotate(${angle}deg)`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'flex-start',
                                      borderRight: '1px solid var(--card-border)',
                                      bgcolor: index % 2 === 0 ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(var(--accent-rgb), 0.08)',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        transform: `rotate(${centerAngle}deg) translateY(-70px)`,
                                        transformOrigin: '0 0',
                                        fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        px: 0.5,
                                        color: 'var(--text)',
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '80px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      {prize.name.length > 12 ? prize.name.substring(0, 10) + '...' : prize.name}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                            {/* Pointer */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: -10,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '10px solid transparent',
                                borderRight: '10px solid transparent',
                                borderTop: '20px solid var(--accent)',
                                zIndex: 10
                              }}
                            />
                          </Box>

                          {/* Spin Button */}
                          <Button
                            variant="contained"
                            onClick={spinPrizeWheel}
                            disabled={spinning || !canUserSpin(selectedUserForPrize)}
                            sx={{
                              bgcolor: 'var(--accent)',
                              color: 'white',
                              fontWeight: 'bold',
                              px: 4,
                              py: 1.5,
                              '&:hover': {
                                bgcolor: 'var(--accent)',
                                opacity: 0.9
                              },
                              '&:disabled': {
                                bgcolor: 'var(--card-border)',
                                color: 'var(--text-secondary)'
                              }
                            }}
                          >
                            {spinning ? 'Spinning...' : 'Spin! 🎰'}
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {!selectedUserForPrize && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      Select a user to spin for prizes
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Chore</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Title"
              value={newChore.title}
              onChange={(e) => setNewChore({...newChore, title: e.target.value})}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={newChore.description}
              onChange={(e) => setNewChore({...newChore, description: e.target.value})}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assign to User</InputLabel>
              <Select
                value={newChore.user_id}
                onChange={(e) => setNewChore({...newChore, user_id: e.target.value})}
              >
                <MenuItem value={0}>Bonus Chore (Unassigned)</MenuItem>
                {users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Time Period</InputLabel>
                <Select
                  value={newChore.time_period}
                  onChange={(e) => setNewChore({...newChore, time_period: e.target.value})}
                >
                  {timePeriods.map(period => (
                    <MenuItem key={period} value={period}>
                      {period.charAt(0).toUpperCase() + period.slice(1).replace('-', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <FormLabel component="legend" sx={{ mb: 1, display: 'block' }}>
                Select Days (choose one or more):
              </FormLabel>
              <FormGroup row>
                {daysOfWeek.map(day => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={newChore.assigned_days_of_week.includes(day)}
                        onChange={() => handleDayToggle(day)}
                        color="primary"
                      />
                    }
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                  />
                ))}
              </FormGroup>
            </Box>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Repeat Type</InputLabel>
              <Select
                value={newChore.repeat_type}
                onChange={(e) => setNewChore({...newChore, repeat_type: e.target.value})}
              >
                {repeatTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="🥟 Clam Value (0 for regular chore)"
              value={newChore.clam_value}
              onChange={(e) => setNewChore({...newChore, clam_value: parseInt(e.target.value) || 0})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              onClick={saveChore} 
              variant="contained"
              disabled={newChore.assigned_days_of_week.length === 0}
            >
              Add Chore{newChore.assigned_days_of_week.length > 1 ? 's' : ''}
            </Button>
          </DialogActions>
        </Dialog>

        {/* PIN Dialog */}
        <Dialog
          open={showPinDialog}
          onClose={() => {}} // Prevent closing without PIN
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
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'var(--primary)',
                    opacity: 0.9
                  }
                }}
              >
                Verify
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
        open={isLoading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            p: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {[0, 1, 2].map((index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  fontSize: '2rem',
                  animation: `clamBounce 1.5s ease-in-out ${index * 0.2}s infinite`,
                  '@keyframes clamBounce': {
                    '0%, 80%, 100%': {
                      transform: 'scale(0.8) translateY(0)',
                      opacity: 0.6,
                    },
                    '40%': {
                      transform: 'scale(1.2) translateY(-20px)',
                      opacity: 1,
                    },
                  },
                }}
              >
                🥟
              </Box>
            ))}
          </Box>
          
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            Processing...
          </Typography>
          
          <CircularProgress
            size={40}
            thickness={2}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
        </Box>
      </Backdrop>
    </>
  );
};

export default ChoreWidget;
