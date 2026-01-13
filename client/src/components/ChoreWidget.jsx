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
    user_id: 0, // Default to bonus user (0) instead of empty string
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

  // Prize Shop states
  const [selectedUserForPrize, setSelectedUserForPrize] = useState(null);
  const [showPrizeShopModal, setShowPrizeShopModal] = useState(false);
  const [purchasingPrize, setPurchasingPrize] = useState(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [purchasedPrize, setPurchasedPrize] = useState(null);
  const [prizeMinimumShells, setPrizeMinimumShells] = useState(0);
  const [bonusChoreClamValue, setBonusChoreClamValue] = useState(1);
  const [showBonusChoreDialog, setShowBonusChoreDialog] = useState(false);
  const [newBonusChore, setNewBonusChore] = useState({
    title: '',
    description: '',
    time_period: 'any-time'
  });

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
    fetchBonusChoreClamValue();
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

  const fetchBonusChoreClamValue = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/settings/BONUS_CHORE_CLAM_VALUE`);
      setBonusChoreClamValue(response.data.value ? parseInt(response.data.value) : 1);
    } catch (error) {
      // 404 is expected if the setting doesn't exist yet - use default value
      if (error.response?.status !== 404) {
        console.error('Error fetching bonus chore clam value setting:', error);
      }
      setBonusChoreClamValue(1);
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

  const handleAddBonusChoreClick = () => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    setShowBonusChoreDialog(true);
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
        // Normalize user_id values to numbers for consistent filtering
        const normalizedChores = response.data.map(chore => {
          // Handle user_id: convert to number, treat null/undefined/empty string as 0
          let userId = chore.user_id;
          if (userId === null || userId === undefined || userId === '') {
            userId = 0;
          } else {
            userId = Number(userId);
            if (isNaN(userId)) userId = 0;
          }
          
          // Normalize clam_value
          const clamValue = Number(chore.clam_value) || 0;
          
          return {
            ...chore,
            user_id: userId,
            clam_value: clamValue
          };
        });
        
        console.log('Fetched chores:', normalizedChores);
        console.log('Chores with clam_value > 0:', normalizedChores.filter(c => c.clam_value > 0));
        console.log('Chores with user_id === 0:', normalizedChores.filter(c => c.user_id === 0));
        console.log('Bonus chores (clam_value > 0 AND user_id === 0):', 
          normalizedChores.filter(c => c.clam_value > 0 && c.user_id === 0));
        setChores(normalizedChores);
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
              assigned_day_of_week: day,
              user_id: Number(newChore.user_id) || 0
            };
          await axios.post(`${getApiUrl()}/api/chores`, choreForDay);
        }
        setNewChore({
          user_id: 0, // Reset to bonus user (0)
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

  const saveBonusChore = async () => {
    try {
      setIsLoading(true);
      // Bonus chores are a single entry available all 7 days of the week
      // They don't need a specific day assigned since they're available any day
      const bonusChore = {
        ...newBonusChore,
        user_id: 0, // Always unassigned (bonus user)
        assigned_day_of_week: 'any', // Special value to indicate available any day
        repeat_type: 'weekly', // Default repeat type
        clam_value: bonusChoreClamValue
      };
      await axios.post(`${getApiUrl()}/api/chores`, bonusChore);
      setNewBonusChore({
        title: '',
        description: '',
        time_period: 'any-time'
      });
      setShowBonusChoreDialog(false);
      fetchChores();
    } catch (error) {
      console.error('Error saving bonus chore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentDay = () => {
    return daysOfWeek[new Date().getDay()];
  };

  const getUserChores = (userId, dayOfWeek = null) => {
    return chores.filter(chore => {
      // Handle type coercion for user_id comparison
      const choreUserId = Number(chore.user_id);
      const targetUserId = Number(userId);
      const userMatches = choreUserId === targetUserId;
      
      if (!userMatches) return false;
      
      // If filtering by day, include chores for that day OR bonus chores (assigned_day_of_week === 'any')
      if (dayOfWeek) {
        return chore.assigned_day_of_week === dayOfWeek || chore.assigned_day_of_week === 'any';
      }
      
      // If not filtering by day, include all chores for the user
      return true;
    });
  };

  const getBonusChores = () => {
    // Since chores are already normalized in fetchChores, we can use them directly
    // But we'll still check to be safe
    const bonusChores = chores.filter(chore => {
      // Use the normalized clam_value (already a number from fetchChores)
      const clamValue = typeof chore.clam_value === 'number' ? chore.clam_value : (Number(chore.clam_value) || 0);
      return clamValue > 0;
    });
    console.log('All bonus chores (clam_value > 0):', bonusChores);
    console.log('Bonus chores details:', bonusChores.map(c => ({ 
      id: c.id, 
      title: c.title, 
      user_id: c.user_id, 
      user_id_type: typeof c.user_id,
      clam_value: c.clam_value,
      clam_value_type: typeof c.clam_value
    })));
    return bonusChores;
  };

  const getAvailableBonusChores = () => {
    const bonusChores = getBonusChores();
    const available = bonusChores.filter(chore => {
      // Use the normalized user_id (already a number from fetchChores)
      const userId = typeof chore.user_id === 'number' ? chore.user_id : (Number(chore.user_id) || 0);
      const isAvailable = userId === 0;
      console.log(`Chore ${chore.id} (${chore.title}): user_id=${chore.user_id} (type: ${typeof chore.user_id}, normalized: ${userId}), isAvailable=${isAvailable}`);
      return isAvailable;
    });
    console.log('Available bonus chores:', available);
    console.log('Available bonus chores count:', available.length);
    return available;
  };

  const getAssignedBonusChores = () => {
    return getBonusChores().filter(chore => {
      // Bonus chores are assigned when user_id is not 0
      return chore.user_id !== 0;
    });
  };

  const getAffordablePrizes = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    return prizes.filter(prize => user.clam_total >= prize.clam_cost);
  };

  const canUserPurchase = (userId, prizeId) => {
    const user = users.find(u => u.id === userId);
    const prize = prizes.find(p => p.id === prizeId);
    if (!user || !prize) return false;
    return user.clam_total >= prize.clam_cost;
  };

  // Empty function for post-purchase actions (to be implemented by user)
  const onPrizePurchased = async (userId, prizeId, prizeName) => {
    // TODO: Add custom logic here (e.g., push request to another device on LAN)
    console.log(`Prize purchased: ${prizeName} by user ${userId}`);
  };

  const purchasePrize = async (prizeId) => {
    if (!selectedUserForPrize) {
      alert('Please select a user first');
      return;
    }

    const prize = prizes.find(p => p.id === prizeId);
    if (!prize) {
      alert('Prize not found');
      return;
    }

    if (!canUserPurchase(selectedUserForPrize, prizeId)) {
      alert(`Not enough shells! This prize costs ${prize.clam_cost} 🥟`);
      return;
    }

    setPurchasingPrize(prizeId);

    try {
      // Call API to deduct shells
      const response = await axios.post(`${getApiUrl()}/api/prizes/select`, {
        user_id: selectedUserForPrize,
        prize_id: prizeId
      });

      // Close shop modal and open celebration modal
      setPurchasedPrize(prize);
      setShowPrizeShopModal(false);
      setShowCelebrationModal(true);
      
      // Refresh user balance
      fetchUsers();
    } catch (error) {
      console.error('Error purchasing prize:', error);
      alert(error.response?.data?.error || 'Failed to purchase prize');
      setPurchasingPrize(null);
    } finally {
      setPurchasingPrize(null);
    }
  };

  const handleCelebrationModalClose = async () => {
    if (purchasedPrize && selectedUserForPrize) {
      // Call post-purchase callback when modal is closed
      await onPrizePurchased(selectedUserForPrize, purchasedPrize.id, purchasedPrize.name);
    }
    
    setShowCelebrationModal(false);
    setPurchasedPrize(null);
    setSelectedUserForPrize(null);
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
            color: 'var(--text)',
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
    // For bonus chores (clam_value > 0), show "Any Day" or hide day chip
    // For regular chores, show the specific day
    const isBonusChore = chore.clam_value > 0;
    const dayName = isBonusChore 
      ? (chore.assigned_day_of_week === 'any' ? 'Any Day' : '')
      : (chore.assigned_day_of_week 
          ? chore.assigned_day_of_week.charAt(0).toUpperCase() + chore.assigned_day_of_week.slice(1)
          : '');
    
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: chore.completed ? 'normal' : 'bold', fontSize: '0.85rem', color: 'var(--text)' }}>
              {chore.title}
            </Typography>
            {dayName && (
              <Chip
                label={dayName}
                size="small"
                sx={{ 
                  bgcolor: isBonusChore ? 'var(--accent)' : 'var(--card-border)', 
                  color: isBonusChore ? 'var(--text)' : 'var(--text)',
                  fontSize: '0.65rem',
                  height: 20,
                  fontWeight: 'bold'
                }}
              />
            )}
            {chore.clam_value > 0 && (
              <Chip
                label={`${chore.clam_value} 🥟`}
                size="small"
                sx={{ bgcolor: 'var(--accent)', color: 'var(--text)' }}
              />
            )}
          </Box>
          {chore.description && (
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {chore.description}
            </Typography>
          )}
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
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
              color: chore.completed ? 'var(--accent)' : 'var(--text)',
              '&:hover': {
                bgcolor: chore.completed ? 'rgba(var(--accent-rgb), 0.12)' : 'var(--accent)',
                opacity: chore.completed ? 1 : 0.9
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
              sx={{ 
                minWidth: 'auto', 
                px: 1,
                backgroundColor: showBonusChores ? 'rgba(var(--primary-rgb), 0.12)' : 'rgba(var(--primary-rgb), 0.12)',
                color: showBonusChores ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--elevation-1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                  color: 'var(--primary)',
                  borderColor: 'var(--primary)'
                }
              }}
              title={showBonusChores ? "Hide Bonus Chores" : "Show Bonus Chores"}
            >
              🥟
            </Button>
            <Button
              startIcon={<Add />}
              onClick={handleAddBonusChoreClick}
              variant="contained"
              size="small"
              sx={{ 
                bgcolor: 'var(--accent)',
                color: 'var(--text)',
                border: '1px solid var(--accent)',
                boxShadow: 'var(--elevation-1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'var(--accent)',
                  opacity: 0.9,
                  boxShadow: 'var(--elevation-2)'
                }
              }}
            >
              Add Bonus Chore
            </Button>
            <Button
              startIcon={<Add />}
              onClick={handleAddChoreClick}
              variant="outlined"
              size="small"
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
                      <Typography variant="body2" sx={{ textAlign: 'center', py: 1, color: 'var(--text-secondary)' }}>
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
                <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: 'var(--text-secondary)' }}>
                  No bonus chores available
                </Typography>
              ) : (
                <Box sx={{ 
                  flex: 1, 
                  overflow: 'auto',
                  display: 'grid',
                  // Force at least 2 columns by capping max column width at ~50% (minus gap)
                  // Without 1fr, columns are capped at 50% width, ensuring at least 2 columns
                  gridTemplateColumns: {
                    xs: 'repeat(auto-fill, minmax(200px, calc(50% - 0.5rem)))',
                    sm: 'repeat(auto-fill, minmax(200px, calc(50% - 0.75rem)))',
                    md: 'repeat(auto-fill, minmax(200px, calc(50% - 1rem)))'
                  },
                  gridAutoRows: 'minmax(120px, auto)',
                  gap: 'var(--spacing-md)',
                  pb: 2,
                  // Ensure minimum 2 rows by setting min-height to accommodate 2 rows
                  minHeight: 'calc(2 * (120px + 1rem))'
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
                            color: 'var(--text)',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                      {chore.description && (
                        <Typography variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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
                                color: 'var(--text)'
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
              🛍️ Prize Shop
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
              <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  gap: 3,
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  width: '100%'
                }}>
                  {/* User Selection - Circular Buttons */}
                  <Box sx={{ 
                    flex: '0 1 auto',
                    minWidth: 200,
                    maxWidth: 400
                  }}>
                    <Typography variant="body2" sx={{ mb: 1.5, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Select User to Shop
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
                        const canPurchase = getAffordablePrizes(user.id).length > 0 && user.clam_total >= prizeMinimumShells;
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
                              cursor: canPurchase ? 'pointer' : 'not-allowed',
                              opacity: canPurchase ? 1 : 0.5
                            }}
                            onClick={() => {
                              if (canPurchase) {
                                setSelectedUserForPrize(user.id);
                                setShowPrizeShopModal(true);
                              }
                            }}
                          >
                            <Box
                              sx={{
                                position: 'relative',
                                border: isSelected ? '3px solid var(--accent)' : '2px solid var(--card-border)',
                                borderRadius: '50%',
                                p: 0.5,
                                bgcolor: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                transition: 'all 0.2s ease',
                                '&:hover': canPurchase ? {
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
                                bgcolor: canPurchase ? 'var(--accent)' : 'var(--card-border)',
                                color: canPurchase ? 'white' : 'var(--text-secondary)'
                              }}
                            />
                            {!canPurchase && (
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

                  {!selectedUserForPrize && (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 4, width: '100%', color: 'var(--text-secondary)' }}>
                      Select a user to shop for prizes
                    </Typography>
                  )}
                </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      <Dialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)} 
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
          <DialogTitle sx={{ color: 'var(--text)' }}>Add New Chore</DialogTitle>
          <DialogContent sx={{ color: 'var(--text)' }}>
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
                onChange={(e) => {
                  const userId = Number(e.target.value);
                  setNewChore({...newChore, user_id: userId});
                }}
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
            <Button onClick={() => setShowAddDialog(false)} sx={{ color: 'var(--text-secondary)' }}>Cancel</Button>
            <Button 
              onClick={saveChore} 
              variant="contained"
              disabled={newChore.assigned_days_of_week.length === 0}
            >
              Add Chore{newChore.assigned_days_of_week.length > 1 ? 's' : ''}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bonus Chore Dialog */}
        <Dialog 
          open={showBonusChoreDialog} 
          onClose={() => setShowBonusChoreDialog(false)} 
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
          <DialogTitle sx={{ color: 'var(--text)' }}>Add New Bonus Chore</DialogTitle>
          <DialogContent sx={{ color: 'var(--text)' }}>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              Bonus chores are available 7 days a week and will be awarded {bonusChoreClamValue} 🥟 when completed.
            </Typography>
            <TextField
              fullWidth
              label="Title"
              value={newBonusChore.title}
              onChange={(e) => setNewBonusChore({...newBonusChore, title: e.target.value})}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={newBonusChore.description}
              onChange={(e) => setNewBonusChore({...newBonusChore, description: e.target.value})}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Time Period</InputLabel>
              <Select
                value={newBonusChore.time_period}
                onChange={(e) => setNewBonusChore({...newBonusChore, time_period: e.target.value})}
              >
                {timePeriods.map(period => (
                  <MenuItem key={period} value={period}>
                    {period.charAt(0).toUpperCase() + period.slice(1).replace('-', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Clam Value: {bonusChoreClamValue} 🥟 (configured in Admin Panel)
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBonusChoreDialog(false)} sx={{ color: 'var(--text-secondary)' }}>Cancel</Button>
            <Button 
              onClick={saveBonusChore} 
              variant="contained"
              disabled={!newBonusChore.title}
            >
              Add Bonus Chore
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
                  color: 'var(--text)',
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

        {/* Prize Shop Modal */}
        <Dialog
          open={showPrizeShopModal}
          onClose={() => {
            setShowPrizeShopModal(false);
            setSelectedUserForPrize(null);
            setShowCelebration(false);
            setPurchasedPrize(null);
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle sx={{ 
            borderBottom: '2px solid var(--accent)',
            pb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🛍️ Prize Shop
            </Typography>
            {selectedUserForPrize && (
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                {users.find(u => u.id === selectedUserForPrize)?.username} - {users.find(u => u.id === selectedUserForPrize)?.clam_total || 0} 🥟
              </Typography>
            )}
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 2,
                maxHeight: '60vh',
                overflowY: 'auto',
                p: 1,
                '@media (max-width: 900px)': {
                  gridTemplateColumns: 'repeat(4, 1fr)'
                },
                '@media (max-width: 700px)': {
                  gridTemplateColumns: 'repeat(3, 1fr)'
                },
                '@media (max-width: 500px)': {
                  gridTemplateColumns: 'repeat(2, 1fr)'
                }
              }}>
                {prizes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    gridColumn: '1 / -1'
                  }}>
                    No prizes available
                  </Typography>
                ) : (
                  prizes.map((prize) => {
                    const canPurchase = selectedUserForPrize ? canUserPurchase(selectedUserForPrize, prize.id) : false;
                    const isPurchasing = purchasingPrize === prize.id;
                    
                    return (
                      <Box
                        key={prize.id}
                        sx={{
                          border: '2px solid',
                          borderColor: canPurchase ? 'var(--accent)' : 'var(--card-border)',
                          borderRadius: 2,
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: 1,
                          bgcolor: canPurchase ? 'rgba(var(--accent-rgb), 0.05)' : 'rgba(0,0,0,0.02)',
                          opacity: canPurchase ? 1 : 0.6,
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        <Box sx={{ 
                          fontSize: '3rem',
                          mb: 0.5,
                          filter: canPurchase ? 'none' : 'grayscale(100%)',
                          transition: 'transform 0.2s ease',
                          color: 'var(--text)'
                        }}>
                          {(prize.emoji && prize.emoji.trim()) ? prize.emoji : '🎁'}
                        </Box>
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 'bold',
                          textAlign: 'center',
                          fontSize: '0.85rem',
                          color: 'var(--text)'
                        }}>
                          {prize.name}
                        </Typography>
                        <Chip
                          label={`${prize.clam_cost} 🥟`}
                          size="small"
                          sx={{
                            bgcolor: canPurchase ? 'var(--accent)' : 'var(--card-border)',
                            color: canPurchase ? 'white' : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            fontSize: '0.75rem'
                          }}
                        />
                        {!canPurchase && selectedUserForPrize && (
                          <Typography variant="caption" sx={{ 
                            color: 'var(--text-secondary)',
                            fontSize: '0.65rem',
                            textAlign: 'center',
                            mt: -0.5
                          }}>
                            Not enough shells
                          </Typography>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!canPurchase || isPurchasing}
                          onClick={() => !isPurchasing && purchasePrize(prize.id)}
                          sx={{
                            mt: 1,
                            width: '100%',
                            bgcolor: canPurchase ? 'var(--accent)' : 'var(--card-border)',
                            color: canPurchase ? 'white' : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            '&:hover': canPurchase ? {
                              bgcolor: 'var(--accent)',
                              opacity: 0.9
                            } : {},
                            '&:disabled': {
                              bgcolor: 'var(--card-border)',
                              color: 'var(--text-secondary)'
                            }
                          }}
                        >
                          {isPurchasing ? 'Purchasing...' : 'Purchase'}
                        </Button>
                        {isPurchasing && (
                          <CircularProgress 
                            size={20} 
                            sx={{ 
                              position: 'absolute',
                              top: 8,
                              right: 8
                            }} 
                          />
                        )}
                      </Box>
                    );
                  })
                )}
              </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid var(--card-border)' }}>
            <Button 
              onClick={() => {
                setShowPrizeShopModal(false);
                setSelectedUserForPrize(null);
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Celebration Modal */}
        <Dialog
          open={showCelebrationModal}
          onClose={handleCelebrationModalClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)'
            }
          }}
        >
          <DialogContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ 
              mb: 2, 
              color: 'var(--accent)', 
              fontWeight: 'bold',
              animation: 'pulse 0.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' }
              }
            }}>
              🎉 Congratulations! 🎉
            </Typography>
            <Box sx={{ 
              fontSize: '5rem',
              mb: 2,
              animation: 'bounce 0.6s ease-in-out 3',
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateY(0) scale(1)' },
                '50%': { transform: 'translateY(-20px) scale(1.2)' }
              }
            }}>
              {purchasedPrize && (purchasedPrize.emoji && purchasedPrize.emoji.trim()) ? purchasedPrize.emoji : '🎁'}
            </Box>
            {purchasedPrize && (
              <>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {purchasedPrize.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  Purchased for {purchasedPrize.clam_cost} 🥟
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'center', borderTop: '1px solid var(--card-border)' }}>
            <Button 
              variant="contained"
              onClick={handleCelebrationModalClose}
              sx={{
                bgcolor: 'var(--accent)',
                color: 'var(--text)',
                fontWeight: 'bold',
                px: 4,
                '&:hover': {
                  bgcolor: 'var(--accent)',
                  opacity: 0.9
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

      <Backdrop
        sx={{
          color: 'var(--text)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(var(--background-rgb, 0, 0, 0), 0.3)',
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
            background: 'rgba(var(--text-rgb, 255, 255, 255), 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(var(--text-rgb, 255, 255, 255), 0.2)',
            boxShadow: '0 8px 32px rgba(var(--background-rgb, 0, 0, 0), 0.3)',
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
              color: 'var(--text)',
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(var(--background-rgb, 0, 0, 0), 0.5)',
            }}
          >
            Processing...
          </Typography>
          
          <CircularProgress
            size={40}
            thickness={2}
            sx={{
              color: 'rgba(var(--text-rgb, 255, 255, 255), 0.7)',
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
