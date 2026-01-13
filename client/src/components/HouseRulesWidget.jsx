import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Box,
  List,
  ListItem,
  CircularProgress,
  Alert
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { getApiUrl } from '../utils/api.js';

const HouseRulesWidget = ({ transparentBackground }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    const widgetSettings = JSON.parse(localStorage.getItem('widgetSettings') || '{}');
    const refreshInterval = widgetSettings.houseRules?.refreshInterval || 0;

    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchRules();
      }, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${getApiUrl()}/api/house-rules`);
      setRules(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching house rules:', error);
      setError('Failed to fetch house rules.');
      setRules([]);
    } finally {
      setLoading(false);
    }
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
          House Rules
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : rules.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No house rules set
          </Typography>
        ) : (
          <List>
            {rules.map((rule, index) => (
              <ListItem
                key={rule.id}
                sx={{
                  border: '1px solid var(--card-border)',
                  borderLeft: '3px solid var(--accent)',
                  borderRadius: 'var(--border-radius-small)',
                  mb: 1,
                  backgroundColor: 'var(--card-bg)',
                  '&:hover': {
                    backgroundColor: 'var(--surface)',
                    transform: 'translateX(2px)',
                    boxShadow: 'var(--elevation-1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Typography
                    variant="body1"
                    component="div"
                    sx={{
                      color: 'var(--text)',
                      '& p': {
                        margin: 0,
                        marginBottom: '0.5rem'
                      },
                      '& p:last-child': {
                        marginBottom: 0
                      },
                      '& ul, & ol': {
                        marginLeft: '1.5rem',
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem'
                      },
                      '& li': {
                        marginBottom: '0.25rem'
                      },
                      '& strong': {
                        fontWeight: 'bold',
                        color: 'var(--text)'
                      },
                      '& em': {
                        fontStyle: 'italic'
                      },
                      '& code': {
                        backgroundColor: 'var(--surface)',
                        padding: '0.125rem 0.25rem',
                        borderRadius: 'var(--border-radius-small)',
                        fontSize: '0.875em',
                        fontFamily: 'monospace'
                      },
                      '& pre': {
                        backgroundColor: 'var(--surface)',
                        padding: '0.75rem',
                        borderRadius: 'var(--border-radius-small)',
                        overflow: 'auto',
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem'
                      },
                      '& pre code': {
                        backgroundColor: 'transparent',
                        padding: 0
                      },
                      '& blockquote': {
                        borderLeft: '3px solid var(--accent)',
                        paddingLeft: '1rem',
                        marginLeft: 0,
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem',
                        fontStyle: 'italic',
                        color: 'var(--text-secondary)'
                      }
                    }}
                  >
                    <ReactMarkdown>{rule.rule_text}</ReactMarkdown>
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Card>
  );
};

export default HouseRulesWidget;
