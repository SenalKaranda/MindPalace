import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import { Warning } from '@mui/icons-material';

const ConfirmationDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'warning' // 'warning', 'error', 'info'
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'error':
        return 'var(--error)';
      case 'info':
        return 'var(--primary)';
      default:
        return 'var(--warning)';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <DialogTitle sx={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning sx={{ color: getSeverityColor() }} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ color: 'var(--text)' }}>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          sx={{ color: 'var(--text-secondary)' }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          sx={{
            backgroundColor: getSeverityColor(),
            color: 'var(--text)',
            '&:hover': {
              backgroundColor: getSeverityColor(),
              opacity: 0.9
            }
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
