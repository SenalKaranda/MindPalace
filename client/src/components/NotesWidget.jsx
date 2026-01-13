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
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Add, Delete, Edit, ExpandMore, ExpandLess } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';
import moment from 'moment';
import ConfirmationDialog from './ConfirmationDialog';
import AlertSnackbar from './AlertSnackbar';

const NotesWidget = ({ transparentBackground }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({
    summary: '',
    description: ''
  });
  const [savingNote, setSavingNote] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [defaultCalendarError, setDefaultCalendarError] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: () => {} });
  const [alertSnackbar, setAlertSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.notes?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchNotes();
      }, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${getApiUrl()}/api/caldav/notes`);
      setNotes(Array.isArray(response.data) ? response.data.sort((a, b) => new Date(b.modified) - new Date(a.modified)) : []);
      setDefaultCalendarError(false);
    } catch (error) {
      console.error('Error fetching notes:', error);
      if (error.response?.status === 400 && error.response?.data?.error?.includes('default calendar')) {
        setDefaultCalendarError(true);
        setError('No default calendar set. Please set a default calendar in Admin Panel.');
      } else {
        setError('Failed to fetch notes.');
      }
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = () => {
    setEditingNote(null);
    setNoteForm({
      summary: '',
      description: ''
    });
    setShowNoteDialog(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      summary: note.summary || '',
      description: note.description || ''
    });
    setShowNoteDialog(true);
  };

  const handleDeleteNote = async (note) => {
    setConfirmDialog({
      open: true,
      message: 'Are you sure you want to delete this note?',
      onConfirm: async () => {
        try {
          await axios.delete(`${getApiUrl()}/api/caldav/notes/${note.uid}`);
          await fetchNotes();
          setAlertSnackbar({ open: true, message: 'Note deleted successfully', severity: 'success' });
        } catch (error) {
          console.error('Error deleting note:', error);
          setAlertSnackbar({ open: true, message: 'Failed to delete note. Please try again.', severity: 'error' });
        }
      }
    });
  };

  const handleSaveNote = async () => {
    if (!noteForm.summary) {
      setAlertSnackbar({ open: true, message: 'Please enter a note title.', severity: 'warning' });
      return;
    }
    
    setSavingNote(true);
    try {
      if (editingNote) {
        await axios.put(`${getApiUrl()}/api/caldav/notes/${editingNote.uid}`, {
          summary: noteForm.summary,
          description: noteForm.description
        });
      } else {
        await axios.post(`${getApiUrl()}/api/caldav/notes`, {
          summary: noteForm.summary,
          description: noteForm.description
        });
      }
      await fetchNotes();
      setShowNoteDialog(false);
    } catch (error) {
      console.error('Error saving note:', error);
      if (error.response?.status === 400 && error.response?.data?.error?.includes('default calendar')) {
        setAlertSnackbar({ open: true, message: 'No default calendar set. Please set a default calendar in Admin Panel.', severity: 'warning' });
      } else {
        setAlertSnackbar({ open: true, message: 'Failed to save note. Please try again.', severity: 'error' });
      }
    } finally {
      setSavingNote(false);
    }
  };

  const toggleExpand = (noteId) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <>
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
        borderBottom: '2px solid var(--accent)',
        background: 'linear-gradient(135deg, var(--accent) 0%, transparent 100%)',
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
            Notes
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleAddNote}
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
            Add Note
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {defaultCalendarError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No default calendar set. Please set a default calendar in Admin Panel to use notes.
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error && !defaultCalendarError ? (
          <Alert severity="error">{error}</Alert>
        ) : notes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No notes yet
          </Typography>
        ) : (
          <List>
            {notes.map((note) => {
              const isExpanded = expandedNotes.has(note.uid);
              return (
                <ListItem
                  key={note.uid}
                  sx={{
                    border: '1px solid var(--card-border)',
                    borderLeft: '3px solid var(--accent)',
                    borderRadius: 'var(--border-radius-small)',
                    mb: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    backgroundColor: 'var(--card-bg)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'var(--surface)',
                      borderLeftColor: 'var(--accent)',
                      transform: 'translateX(2px)',
                      boxShadow: 'var(--elevation-1)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {note.summary}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          label={moment(note.modified).format('MMM D, YYYY')}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: 'var(--accent)',
                            color: 'var(--accent)',
                            fontSize: '0.7rem'
                          }}
                        />
                        {note.source_name && (
                          <Chip
                            label={note.source_name}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'var(--accent)',
                              color: 'var(--accent)',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                      </Box>
                      {note.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                            overflow: isExpanded ? 'visible' : 'hidden',
                            textOverflow: isExpanded ? 'clip' : 'ellipsis'
                          }}
                        >
                          {isExpanded ? note.description : truncateText(note.description)}
                        </Typography>
                      )}
                      {note.description && note.description.length > 100 && (
                        <Button
                          size="small"
                          onClick={() => toggleExpand(note.uid)}
                          startIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                          sx={{ 
                            mt: 0.5,
                            color: 'var(--accent)',
                            '&:hover': {
                              backgroundColor: 'var(--surface)',
                              opacity: 0.8
                            }
                          }}
                        >
                          {isExpanded ? 'Show Less' : 'Show More'}
                        </Button>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditNote(note)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteNote(note)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* Note Add/Edit Dialog */}
      <Dialog
        open={showNoteDialog}
        onClose={() => setShowNoteDialog(false)}
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
          {editingNote ? 'Edit Note' : 'Add Note'}
        </DialogTitle>
        <DialogContent sx={{ color: 'var(--text)' }}>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Note Title"
              value={noteForm.summary}
              onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Content"
              value={noteForm.description}
              onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
              multiline
              rows={8}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowNoteDialog(false)}
            sx={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveNote}
            disabled={savingNote || !noteForm.summary}
            sx={{
              backgroundColor: 'var(--accent)',
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--accent)',
                opacity: 0.9
              },
              '&:disabled': {
                backgroundColor: 'var(--text-secondary)',
                opacity: 0.5
              }
            }}
          >
            {savingNote ? 'Saving...' : editingNote ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>

    <ConfirmationDialog
      open={confirmDialog.open}
      onClose={() => setConfirmDialog({ open: false, message: '', onConfirm: () => {} })}
      onConfirm={confirmDialog.onConfirm}
      title="Delete Note"
      message={confirmDialog.message}
      confirmText="Delete"
      cancelText="Cancel"
      severity="warning"
    />

    <AlertSnackbar
      open={alertSnackbar.open}
      onClose={() => setAlertSnackbar({ open: false, message: '', severity: 'info' })}
      message={alertSnackbar.message}
      severity={alertSnackbar.severity}
    />
    </>
  );
};

export default NotesWidget;
