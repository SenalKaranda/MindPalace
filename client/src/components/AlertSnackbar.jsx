import React from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

const AlertSnackbar = ({ 
  open, 
  onClose, 
  message, 
  severity = 'info', // 'success', 'error', 'warning', 'info'
  title,
  autoHideDuration = 6000
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: { xs: 16, sm: 24 },
      }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          width: '100%',
          backgroundColor: severity === 'error' ? 'var(--error)' : 
                          severity === 'warning' ? 'var(--warning)' :
                          severity === 'success' ? 'var(--success)' :
                          'var(--primary)',
          color: 'var(--text)',
          '& .MuiAlert-icon': {
            color: 'var(--text)',
          },
        }}
      >
        {title && <AlertTitle sx={{ color: 'var(--text)' }}>{title}</AlertTitle>}
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AlertSnackbar;
