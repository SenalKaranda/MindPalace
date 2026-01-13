import React, { useState, useEffect } from 'react';
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
  Checkbox,
  Chip,
  CircularProgress,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add, Delete, CheckCircle, ClearAll } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';

const GroceryListWidget = ({ transparentBackground }) => {
  const [groceryItems, setGroceryItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('groceryWidgetAuthenticated') === 'true';
  });
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [meals, setMeals] = useState([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateDateRange, setGenerateDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchUsers();
    fetchGroceryItems();
  }, []);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.groceryList?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchGroceryItems();
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

  const fetchGroceryItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${getApiUrl()}/api/grocery`);
      setGroceryItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching grocery items:', error);
      setError('Failed to fetch grocery items.');
      setGroceryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const verifyPin = async (pin) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/admin/verify-pin`, { pin });
      if (response.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('groceryWidgetAuthenticated', 'true');
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

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      return;
    }
    try {
      await axios.post(`${getApiUrl()}/api/grocery`, {
        name: newItem.name,
        quantity: newItem.quantity || null,
        unit: newItem.unit || null,
        user_id: selectedUser
      });
      setNewItem({ name: '', quantity: '', unit: '' });
      setShowAddDialog(false);
      fetchGroceryItems();
    } catch (error) {
      console.error('Error adding grocery item:', error);
      alert('Failed to add grocery item');
    }
  };

  const handleCheckItem = async (item) => {
    try {
      const userId = selectedUser || item.user_id;
      await axios.post(`${getApiUrl()}/api/grocery/${item.id}/check`, {
        checked: !item.checked,
        user_id: userId
      });
      fetchGroceryItems();
    } catch (error) {
      console.error('Error checking item:', error);
      if (error.response?.status === 403) {
        alert('You are not authorized to check this item');
      } else {
        alert('Failed to check item');
      }
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await axios.delete(`${getApiUrl()}/api/grocery/${itemId}`);
      fetchGroceryItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleClearChecked = () => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    if (window.confirm('Clear all checked items?')) {
      clearCheckedItems();
    }
  };

  const clearCheckedItems = async () => {
    try {
      await axios.post(
        `${getApiUrl()}/api/grocery/clear`,
        {},
        { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
      );
      fetchGroceryItems();
    } catch (error) {
      console.error('Error clearing checked items:', error);
      alert('Failed to clear checked items');
    }
  };

  const handleGenerateFromMeals = () => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    setShowGenerateDialog(true);
  };

  const generateFromMeals = async () => {
    try {
      await axios.post(
        `${getApiUrl()}/api/grocery/generate-from-meals`,
        generateDateRange,
        { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
      );
      setShowGenerateDialog(false);
      fetchGroceryItems();
    } catch (error) {
      console.error('Error generating grocery list:', error);
      alert('Failed to generate grocery list');
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
                border: '2px solid var(--secondary)',
                display: 'block'
              }}
              onError={handleImageError}
            />
            <Avatar
              sx={{
                width: 50,
                height: 50,
                bgcolor: 'var(--secondary)',
                border: '2px solid var(--secondary)',
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
              bgcolor: 'var(--secondary)',
              border: '2px solid var(--secondary)',
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
            🛒 Grocery List
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
          <Typography>Loading grocery list...</Typography>
        </Box>
      </Card>
    );
  }

  const uncheckedItems = groceryItems.filter(item => !item.checked);
  const checkedItems = groceryItems.filter(item => item.checked);

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
          borderBottom: '2px solid var(--secondary)',
          background: 'linear-gradient(135deg, var(--secondary) 0%, transparent 100%)',
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
              🛒 Grocery List
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleGenerateFromMeals}
                sx={{ minWidth: 'auto', px: 1 }}
                title="Generate from Meals"
              >
                📋
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearChecked}
                disabled={checkedItems.length === 0}
                sx={{ minWidth: 'auto', px: 1 }}
                title="Clear Checked Items"
              >
                <ClearAll fontSize="small" />
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddDialog(true)}
                sx={{ bgcolor: 'var(--secondary)' }}
              >
                Add
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2 }}>
          {error && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: 'var(--border-radius-small)', flexShrink: 0 }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}

          {/* Grocery Items List */}
          <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
            {uncheckedItems.length === 0 && checkedItems.length === 0 ? (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  textAlign: 'center', 
                  py: 2,
                  fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)'
                }}
              >
                No grocery items
              </Typography>
            ) : (
              <>
                {uncheckedItems.map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      border: '1px solid var(--card-border)',
                      borderRadius: 'var(--border-radius-small)',
                      mb: 1,
                      bgcolor: 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.05)'
                      }
                    }}
                  >
                    <Checkbox
                      checked={false}
                      onChange={() => handleCheckItem(item)}
                      sx={{ color: 'var(--secondary)' }}
                    />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)' }}>
                            {item.name}
                          </Typography>
                          {(item.quantity || item.unit) && (
                            <Chip
                              label={`${item.quantity || ''} ${item.unit || ''}`.trim()}
                              size="small"
                              sx={{
                                bgcolor: 'var(--secondary)',
                                color: 'white',
                                fontSize: 'clamp(0.65rem, 1vw, 0.75rem)',
                                height: 20
                              }}
                            />
                          )}
                          {item.meal_ids && item.meal_ids.length > 0 && (
                            <Chip
                              label={`${item.meal_ids.length} meal${item.meal_ids.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                bgcolor: 'var(--accent)',
                                color: 'white',
                                fontSize: 'clamp(0.65rem, 1vw, 0.75rem)',
                                height: 20
                              }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteItem(item.id)}
                      sx={{ color: 'var(--error)' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
                {checkedItems.length > 0 && (
                  <>
                    <Typography variant="caption" sx={{ mt: 2, mb: 1, color: 'var(--text-secondary)', fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)' }}>
                      Checked Items
                    </Typography>
                    {checkedItems.map((item) => (
                      <ListItem
                        key={item.id}
                        sx={{
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--border-radius-small)',
                          mb: 1,
                          bgcolor: 'transparent',
                          opacity: 0.6,
                          textDecoration: 'line-through'
                        }}
                      >
                        <Checkbox
                          checked={true}
                          onChange={() => handleCheckItem(item)}
                          sx={{ color: 'var(--secondary)' }}
                        />
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" sx={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)' }}>
                                {item.name}
                              </Typography>
                              {(item.quantity || item.unit) && (
                                <Chip
                                  label={`${item.quantity || ''} ${item.unit || ''}`.trim()}
                                  size="small"
                                  sx={{
                                    bgcolor: 'var(--secondary)',
                                    color: 'white',
                                    fontSize: 'clamp(0.65rem, 1vw, 0.75rem)',
                                    height: 20,
                                    opacity: 0.7
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteItem(item.id)}
                          sx={{ color: 'var(--error)' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItem>
                    ))}
                  </>
                )}
              </>
            )}
          </Box>

          {/* User Selection */}
          <Box sx={{ borderTop: '1px solid var(--card-border)', pt: 2, flexShrink: 0 }}>
            <Typography variant="body2" sx={{ mb: 1.5, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)' }}>
              Select User for New Items
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1.5, 
              justifyContent: 'center',
              alignItems: 'center'
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
                        border: isSelected ? '3px solid var(--secondary)' : '2px solid var(--card-border)',
                        borderRadius: '50%',
                        p: 0.5,
                        bgcolor: isSelected ? 'rgba(var(--secondary-rgb), 0.1)' : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'var(--secondary)',
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
          </Box>
        </Box>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Grocery Item</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <TextField
            fullWidth
            label="Item Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Quantity"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Unit"
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              sx={{ flex: 1 }}
              placeholder="lbs, cups, etc."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddItem}
            disabled={!newItem.name.trim()}
            sx={{ bgcolor: 'var(--secondary)' }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate from Meals Dialog */}
      <Dialog open={showGenerateDialog} onClose={() => setShowGenerateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Grocery List from Meals</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={generateDateRange.startDate}
            onChange={(e) => setGenerateDateRange({ ...generateDateRange, startDate: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={generateDateRange.endDate}
            onChange={(e) => setGenerateDateRange({ ...generateDateRange, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={generateFromMeals}
            sx={{ bgcolor: 'var(--secondary)' }}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

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
                bgcolor: 'var(--secondary)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'var(--secondary)',
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

export default GroceryListWidget;
