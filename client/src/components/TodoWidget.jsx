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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import { ChevronLeft, ChevronRight, Add, CheckCircle, Undo, Delete, Edit } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import moment from 'moment';

const TodoWidget = ({ transparentBackground }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [todoForm, setTodoForm] = useState({
    summary: '',
    description: '',
    due: '',
    assigned_user: null
  });
  const [savingTodo, setSavingTodo] = useState(false);
  const [users, setUsers] = useState([]);
  const [undoState, setUndoState] = useState({ todo: null, timeout: null });
  const [defaultCalendarError, setDefaultCalendarError] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTodos();
  }, [selectedDate]);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.todos?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchTodos();
      }, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/users`);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = moment(selectedDate).format('YYYY-MM-DD');
      const response = await axios.get(`${getApiUrl()}/api/caldav/todos?date=${dateStr}`);
      setTodos(Array.isArray(response.data) ? response.data : []);
      setDefaultCalendarError(false);
    } catch (error) {
      console.error('Error fetching todos:', error);
      if (error.response?.status === 400 && error.response?.data?.error?.includes('default calendar')) {
        setDefaultCalendarError(true);
        setError('No default calendar set. Please set a default calendar in Admin Panel.');
      } else {
        setError('Failed to fetch todos.');
      }
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleTodoClick = async (todo) => {
    // Mark as complete
    try {
      await axios.put(`${getApiUrl()}/api/caldav/todos/${todo.uid}`, {
        status: 'COMPLETED'
      });
      
      // Store for undo
      const timeout = setTimeout(() => {
        setUndoState({ todo: null, timeout: null });
      }, 5000);
      
      setUndoState({ todo, timeout });
      await fetchTodos();
    } catch (error) {
      console.error('Error completing todo:', error);
      alert('Failed to complete todo. Please try again.');
    }
  };

  const handleUndo = async () => {
    if (!undoState.todo) return;
    
    try {
      await axios.put(`${getApiUrl()}/api/caldav/todos/${undoState.todo.uid}`, {
        status: 'NEEDS-ACTION'
      });
      
      if (undoState.timeout) {
        clearTimeout(undoState.timeout);
      }
      setUndoState({ todo: null, timeout: null });
      await fetchTodos();
    } catch (error) {
      console.error('Error undoing todo completion:', error);
      alert('Failed to undo. Please try again.');
    }
  };

  const handleAddTodo = () => {
    setEditingTodo(null);
    setTodoForm({
      summary: '',
      description: '',
      due: moment(selectedDate).format('YYYY-MM-DDTHH:mm'),
      assigned_user: null
    });
    setShowTodoDialog(true);
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setTodoForm({
      summary: todo.summary || '',
      description: todo.description || '',
      due: todo.due ? moment(todo.due).format('YYYY-MM-DDTHH:mm') : moment(selectedDate).format('YYYY-MM-DDTHH:mm'),
      assigned_user: todo.assigned_user || null
    });
    setShowTodoDialog(true);
  };

  const handleDeleteTodo = async (todo) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) return;
    
    try {
      await axios.delete(`${getApiUrl()}/api/caldav/todos/${todo.uid}`);
      await fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Failed to delete todo. Please try again.');
    }
  };

  const handleSaveTodo = async () => {
    if (!todoForm.summary) {
      alert('Please enter a todo title.');
      return;
    }
    
    setSavingTodo(true);
    try {
      if (editingTodo) {
        await axios.put(`${getApiUrl()}/api/caldav/todos/${editingTodo.uid}`, {
          summary: todoForm.summary,
          description: todoForm.description,
          due: todoForm.due,
          assigned_user: todoForm.assigned_user
        });
      } else {
        await axios.post(`${getApiUrl()}/api/caldav/todos`, {
          summary: todoForm.summary,
          description: todoForm.description,
          due: todoForm.due,
          assigned_user: todoForm.assigned_user
        });
      }
      await fetchTodos();
      setShowTodoDialog(false);
    } catch (error) {
      console.error('Error saving todo:', error);
      if (error.response?.status === 400 && error.response?.data?.error?.includes('default calendar')) {
        alert('No default calendar set. Please set a default calendar in Admin Panel.');
      } else {
        alert('Failed to save todo. Please try again.');
      }
    } finally {
      setSavingTodo(false);
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'Unknown';
  };

  const isToday = moment(selectedDate).isSame(moment(), 'day');
  const isPast = moment(selectedDate).isBefore(moment(), 'day');
  const isFuture = moment(selectedDate).isAfter(moment(), 'day');

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.95rem'
          }}>
            Todos
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleAddTodo}
            disabled={defaultCalendarError}
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
              },
              '&:disabled': {
                backgroundColor: 'var(--card-border)',
                color: 'var(--text-secondary)',
                opacity: 0.5
              }
            }}
          >
            Add Todo
          </Button>
        </Box>

        {/* Date Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <IconButton 
            onClick={handlePreviousDay} 
            size="small"
            sx={{
              color: 'var(--text-secondary)',
              '&:hover': {
                backgroundColor: 'var(--secondary)',
                color: 'var(--text)'
              }
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 'bold',
              color: isToday ? 'var(--secondary)' : isPast ? 'var(--text-secondary)' : 'var(--text)',
              fontSize: '0.9rem'
            }}
          >
            {moment(selectedDate).format('dddd, MMMM D, YYYY')}
          </Typography>
          <IconButton 
            onClick={handleNextDay} 
            size="small"
            sx={{
              color: 'var(--text-secondary)',
              '&:hover': {
                backgroundColor: 'var(--secondary)',
                color: 'var(--text)'
              }
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
        {isToday && (
          <Chip 
            label="Today" 
            size="small" 
            sx={{ 
              mt: 1,
              backgroundColor: 'var(--secondary)',
              color: 'var(--text)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }} 
          />
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {defaultCalendarError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No default calendar set. Please set a default calendar in Admin Panel to use todos.
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error && !defaultCalendarError ? (
          <Alert severity="error">{error}</Alert>
        ) : todos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No todos for this day
          </Typography>
        ) : (
          <List>
              {todos.map((todo) => (
                <ListItem
                  key={todo.uid}
                  sx={{
                    border: '1px solid var(--card-border)',
                    borderLeft: '3px solid var(--secondary)',
                    borderRadius: 'var(--border-radius-small)',
                    mb: 1,
                    cursor: 'pointer',
                    backgroundColor: 'var(--card-bg)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'var(--surface)',
                      borderLeftColor: 'var(--secondary)',
                      transform: 'translateX(2px)',
                      boxShadow: 'var(--elevation-1)'
                    }
                  }}
                  onClick={() => handleTodoClick(todo)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ fontSize: 20, color: 'var(--secondary)' }} />
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'var(--text)' }}>
                          {todo.summary}
                        </Typography>
                        {todo.assigned_user && (
                          <Chip
                            label={getUserName(todo.assigned_user)}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'var(--secondary)',
                              color: 'var(--secondary)',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ mt: 0.5, display: 'block' }}>
                        {todo.description && (
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                            {todo.description}
                          </Typography>
                        )}
                        {todo.due && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Due: {moment(todo.due).format('h:mm A')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTodo(todo);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTodo(todo);
                      }}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
        )}
      </Box>

      {/* Todo Add/Edit Dialog */}
      <Dialog
        open={showTodoDialog}
        onClose={() => setShowTodoDialog(false)}
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
          {editingTodo ? 'Edit Todo' : 'Add Todo'}
        </DialogTitle>
        <DialogContent sx={{ color: 'var(--text)' }}>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Todo Title"
              value={todoForm.summary}
              onChange={(e) => setTodoForm({ ...todoForm, summary: e.target.value })}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={todoForm.description}
              onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Due Date & Time"
              type="datetime-local"
              value={todoForm.due}
              onChange={(e) => setTodoForm({ ...todoForm, due: e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={todoForm.assigned_user || ''}
                label="Assign To"
                onChange={(e) => setTodoForm({ ...todoForm, assigned_user: e.target.value || null })}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowTodoDialog(false)}
            sx={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveTodo}
            disabled={savingTodo || !todoForm.summary}
            sx={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--secondary)',
                opacity: 0.9
              },
              '&:disabled': {
                backgroundColor: 'var(--text-secondary)',
                opacity: 0.5
              }
            }}
          >
            {savingTodo ? 'Saving...' : editingTodo ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Undo Snackbar - Pull-up visual */}
      <Snackbar
        open={!!undoState.todo}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={5000}
        onClose={() => {
          if (undoState.timeout) {
            clearTimeout(undoState.timeout);
          }
          setUndoState({ todo: null, timeout: null });
        }}
        sx={{
          bottom: { xs: 16, sm: 24 },
          '& .MuiSnackbarContent-root': {
            backgroundColor: 'var(--secondary)',
            color: 'var(--text)',
            borderRadius: 'var(--border-radius-medium)',
            boxShadow: 'var(--elevation-3)',
            minWidth: 'auto',
            padding: '8px 16px'
          }
        }}
        message={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Todo completed: {undoState.todo?.summary}
            </Typography>
          </Box>
        }
        action={
          <Button
            size="small"
            variant="contained"
            startIcon={<Undo />}
            onClick={handleUndo}
            sx={{ 
              ml: 2,
              backgroundColor: 'var(--card-bg)', 
              color: 'var(--secondary)', 
              fontWeight: 'bold',
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.9)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Undo
          </Button>
        }
      />
    </Card>
  );
};

export default TodoWidget;
