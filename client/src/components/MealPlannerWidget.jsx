import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel
} from '@mui/material';
import { ChevronLeft, ChevronRight, Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import moment from 'moment';

const MealPlannerWidget = ({ transparentBackground }) => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealForm, setMealForm] = useState({
    title: '',
    description: '',
    recipe: '',
    recipe_url: '',
    cooktime: '',
    preptime: '',
    servings: '',
    category: '',
    ingredients: [],
    date_specific: 0,
    assigned_date: '',
    assigned_weekday: 'monday'
  });
  const [savingMeal, setSavingMeal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('mealPlannerAuthenticated') === 'true';
  });
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: '' });

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchMeals();
  }, [currentWeek]);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.mealPlanner?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchMeals();
      }, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, []);

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const fetchMeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const weekStart = getWeekStart(currentWeek);
      const startDate = weekStart.toISOString().split('T')[0];
      const response = await axios.get(`${getApiUrl()}/api/meals/week/${startDate}`);
      setMeals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setError('Failed to fetch meals.');
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const getMealsForDay = (date, weekday) => {
    const dateStr = date.toISOString().split('T')[0];
    const weekdayName = weekdays[date.getDay()];
    
    return meals.filter(meal => {
      if (meal.date_specific === 1) {
        return meal.assigned_date === dateStr;
      } else {
        return meal.assigned_weekday === weekdayName;
      }
    });
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const getWeekLabel = () => {
    const weekStart = getWeekStart(currentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${moment(weekStart).format('MMM D')} - ${moment(weekEnd).format('D, YYYY')}`;
    } else {
      return `${moment(weekStart).format('MMM D')} - ${moment(weekEnd).format('MMM D, YYYY')}`;
    }
  };

  const verifyPin = async (pin) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/admin/verify-pin`, { pin });
      if (response.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('mealPlannerAuthenticated', 'true');
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

  const handleAddMeal = () => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    setEditingMeal(null);
    setMealForm({
      title: '',
      description: '',
      recipe: '',
      recipe_url: '',
      cooktime: '',
      preptime: '',
      servings: '',
      category: '',
      ingredients: [],
      date_specific: 0,
      assigned_date: '',
      assigned_weekday: 'monday'
    });
    setShowMealDialog(true);
  };

  const handleEditMeal = (meal) => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    setEditingMeal(meal);
    setMealForm({
      title: meal.title || '',
      description: meal.description || '',
      recipe: meal.recipe || '',
      recipe_url: meal.recipe_url || '',
      cooktime: meal.cooktime || '',
      preptime: meal.preptime || '',
      servings: meal.servings || '',
      category: meal.category || '',
      ingredients: meal.ingredients || [],
      date_specific: meal.date_specific || 0,
      assigned_date: meal.assigned_date || '',
      assigned_weekday: meal.assigned_weekday || 'monday'
    });
    setShowMealDialog(true);
  };

  const handleDeleteMeal = async (mealId) => {
    if (!isAuthenticated) {
      setShowPinDialog(true);
      return;
    }
    if (!window.confirm('Delete this meal?')) return;
    
    try {
      await axios.delete(
        `${getApiUrl()}/api/meals/${mealId}`,
        { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
      );
      fetchMeals();
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal');
    }
  };

  const handleSaveMeal = async () => {
    if (!mealForm.title.trim()) {
      alert('Title is required');
      return;
    }
    if (mealForm.ingredients.length === 0) {
      alert('At least one ingredient is required');
      return;
    }
    if (mealForm.date_specific === 1 && !mealForm.assigned_date) {
      alert('Date is required for date-specific meals');
      return;
    }
    if (mealForm.date_specific === 0 && !mealForm.assigned_weekday) {
      alert('Weekday is required for recurring meals');
      return;
    }

    setSavingMeal(true);
    try {
      const mealData = {
        title: mealForm.title,
        description: mealForm.description || null,
        recipe: mealForm.recipe || null,
        recipe_url: mealForm.recipe_url || null,
        cooktime: mealForm.cooktime ? parseInt(mealForm.cooktime) : null,
        preptime: mealForm.preptime ? parseInt(mealForm.preptime) : null,
        servings: mealForm.servings ? parseInt(mealForm.servings) : null,
        category: mealForm.category || null,
        ingredients: mealForm.ingredients,
        date_specific: mealForm.date_specific,
        assigned_date: mealForm.date_specific === 1 ? mealForm.assigned_date : null,
        assigned_weekday: mealForm.date_specific === 0 ? mealForm.assigned_weekday : null
      };

      if (editingMeal) {
        await axios.put(
          `${getApiUrl()}/api/meals/${editingMeal.id}`,
          mealData,
          { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
        );
      } else {
        await axios.post(
          `${getApiUrl()}/api/meals`,
          mealData,
          { headers: { 'x-admin-pin': localStorage.getItem('adminPin') || '' } }
        );
      }
      setShowMealDialog(false);
      fetchMeals();
    } catch (error) {
      console.error('Error saving meal:', error);
      alert('Failed to save meal');
    } finally {
      setSavingMeal(false);
    }
  };

  const handleAddIngredient = () => {
    if (!newIngredient.name.trim()) return;
    setMealForm({
      ...mealForm,
      ingredients: [...mealForm.ingredients, { ...newIngredient }]
    });
    setNewIngredient({ name: '', quantity: '', unit: '' });
  };

  const handleRemoveIngredient = (index) => {
    setMealForm({
      ...mealForm,
      ingredients: mealForm.ingredients.filter((_, i) => i !== index)
    });
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
            🍽️ Meal Planner
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
          <Typography>Loading meals...</Typography>
        </Box>
      </Card>
    );
  }

  const weekStart = getWeekStart(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

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
          borderBottom: '2px solid var(--primary)',
          background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)',
          backgroundSize: '100% 3px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={handlePreviousWeek}
                size="small"
                sx={{ color: 'var(--text)' }}
              >
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold',
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: 'clamp(0.85rem, 1.5vw, 0.95rem)',
                minWidth: '200px',
                textAlign: 'center'
              }}>
                🍽️ {getWeekLabel()}
              </Typography>
              <IconButton
                onClick={handleNextWeek}
                size="small"
                sx={{ color: 'var(--text)' }}
              >
                <ChevronRight />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddMeal}
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
                Add Meal
              </Button>
            </Box>
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

          {/* Week View Grid */}
          <Box sx={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 'var(--spacing-sm)', 
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {weekDays.map((date, index) => {
              const dayMeals = getMealsForDay(date, weekdays[date.getDay()]);
              const isToday = moment(date).isSame(moment(), 'day');
              
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
                  <Box sx={{ textAlign: 'center', mb: 1, borderBottom: '1px solid var(--card-border)', pb: 1, flexShrink: 0 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: isToday ? 'var(--primary)' : 'inherit',
                        fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      {weekdayLabels[date.getDay()]}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: isToday ? 'var(--primary)' : 'inherit',
                        fontSize: 'clamp(1rem, 2vw, 1.5rem)'
                      }}
                    >
                      {date.getDate()}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'var(--text-secondary)',
                        fontSize: 'clamp(0.65rem, 1.1vw, 0.75rem)'
                      }}
                    >
                      {moment(date).format('MMM')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {dayMeals.length === 0 ? (
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          textAlign: 'center', 
                          display: 'block', 
                          mt: 2,
                          fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)'
                        }}
                      >
                        No meals
                      </Typography>
                    ) : (
                      dayMeals.map((meal, mealIndex) => (
                        <Box
                          key={mealIndex}
                          onClick={() => handleEditMeal(meal)}
                          sx={{
                            p: 1,
                            mb: 1,
                            cursor: 'pointer',
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
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
                                flex: 1
                              }}
                            >
                              {meal.title}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeal(meal.id);
                              }}
                              sx={{ color: 'var(--error)', p: 0.5 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                          {meal.category && (
                            <Chip
                              label={meal.category}
                              size="small"
                              sx={{
                                bgcolor: 'var(--primary)',
                                color: 'var(--text)',
                                fontSize: 'clamp(0.6rem, 1vw, 0.7rem)',
                                height: 20,
                                mb: 0.5
                              }}
                            />
                          )}
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                            {meal.cooktime && (
                              <Typography variant="caption" sx={{ fontSize: 'clamp(0.65rem, 1vw, 0.75rem)' }}>
                                ⏱️ {meal.cooktime}m
                              </Typography>
                            )}
                            {meal.preptime && (
                              <Typography variant="caption" sx={{ fontSize: 'clamp(0.65rem, 1vw, 0.75rem)' }}>
                                🥄 {meal.preptime}m prep
                              </Typography>
                            )}
                            {meal.servings && (
                              <Typography variant="caption" sx={{ fontSize: 'clamp(0.65rem, 1vw, 0.75rem)' }}>
                                👥 {meal.servings}
                              </Typography>
                            )}
                          </Box>
                          {meal.recipe_url && (
                            <Typography 
                              variant="caption" 
                              component="a"
                              href={meal.recipe_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                color: 'var(--primary)',
                                textDecoration: 'underline',
                                fontSize: 'clamp(0.65rem, 1vw, 0.75rem)',
                                display: 'block',
                                mt: 0.5
                              }}
                            >
                              View Recipe →
                            </Typography>
                          )}
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Card>

      {/* Meal Form Dialog */}
      <Dialog 
        open={showMealDialog} 
        onClose={() => setShowMealDialog(false)} 
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
        <DialogTitle sx={{ color: 'var(--text)' }}>{editingMeal ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
        <DialogContent sx={{ p: 2, color: 'var(--text)' }}>
          <TextField
            fullWidth
            label="Title"
            value={mealForm.title}
            onChange={(e) => setMealForm({ ...mealForm, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={mealForm.description}
            onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Recipe"
            value={mealForm.recipe}
            onChange={(e) => setMealForm({ ...mealForm, recipe: e.target.value })}
            multiline
            rows={4}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Recipe URL"
            value={mealForm.recipe_url}
            onChange={(e) => setMealForm({ ...mealForm, recipe_url: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Cook Time (minutes)"
              type="number"
              value={mealForm.cooktime}
              onChange={(e) => setMealForm({ ...mealForm, cooktime: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Prep Time (minutes)"
              type="number"
              value={mealForm.preptime}
              onChange={(e) => setMealForm({ ...mealForm, preptime: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Servings"
              type="number"
              value={mealForm.servings}
              onChange={(e) => setMealForm({ ...mealForm, servings: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            fullWidth
            label="Category"
            value={mealForm.category}
            onChange={(e) => setMealForm({ ...mealForm, category: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="e.g., Breakfast, Dinner, Vegetarian"
          />
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Date Assignment</FormLabel>
            <RadioGroup
              value={mealForm.date_specific}
              onChange={(e) => setMealForm({ ...mealForm, date_specific: parseInt(e.target.value) })}
            >
              <FormControlLabel value={0} control={<Radio />} label="Recurring (by weekday)" />
              <FormControlLabel value={1} control={<Radio />} label="Date-specific" />
            </RadioGroup>
          </FormControl>

          {mealForm.date_specific === 0 ? (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Weekday</InputLabel>
              <Select
                value={mealForm.assigned_weekday}
                onChange={(e) => setMealForm({ ...mealForm, assigned_weekday: e.target.value })}
                label="Weekday"
              >
                {weekdays.map(day => (
                  <MenuItem key={day} value={day}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={mealForm.assigned_date}
              onChange={(e) => setMealForm({ ...mealForm, assigned_date: e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              required
            />
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Ingredients
            </Typography>
            {mealForm.ingredients.map((ing, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  label="Name"
                  value={ing.name}
                  size="small"
                  sx={{ flex: 2 }}
                  disabled
                />
                <TextField
                  label="Quantity"
                  value={ing.quantity}
                  size="small"
                  sx={{ flex: 1 }}
                  disabled
                />
                <TextField
                  label="Unit"
                  value={ing.unit}
                  size="small"
                  sx={{ flex: 1 }}
                  disabled
                />
                <IconButton
                  size="small"
                  onClick={() => handleRemoveIngredient(index)}
                  sx={{ color: 'var(--error)' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                label="Ingredient Name"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                size="small"
                sx={{ flex: 2 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIngredient();
                  }
                }}
              />
              <TextField
                label="Quantity"
                value={newIngredient.quantity}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Unit"
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
                placeholder="lbs, cups, etc."
              />
              <Button
                variant="outlined"
                onClick={handleAddIngredient}
                disabled={!newIngredient.name.trim()}
                sx={{ minWidth: 'auto' }}
              >
                <Add />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowMealDialog(false)} sx={{ color: 'var(--text-secondary)' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveMeal}
            disabled={savingMeal || !mealForm.title.trim() || mealForm.ingredients.length === 0}
            sx={{ bgcolor: 'var(--primary)' }}
          >
            {savingMeal ? 'Saving...' : 'Save'}
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
                bgcolor: 'var(--primary)',
                color: 'var(--text)',
                '&:hover': {
                  bgcolor: 'var(--primary)',
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

export default MealPlannerWidget;
