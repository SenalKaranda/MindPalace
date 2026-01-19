/**
 * Custom hook for parallel data fetching across all widgets
 * Fetches all widget data in parallel to reduce waterfall loading
 */
import { useState, useEffect } from 'react';
import { cachedGet } from './api.js';

export const useWidgetData = (enabledWidgets) => {
  const [data, setData] = useState({
    users: null,
    chores: null,
    events: null,
    photos: null,
    todos: null,
    notes: null,
    alarms: null,
    houseRules: null,
    marbles: null,
    groceryItems: null,
    meals: null,
    mealSuggestions: null,
    calendarSources: null,
    photoSources: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchAllData = async () => {
      setData(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Build array of promises for all enabled widgets
        const promises = [];

        // Always fetch settings (needed for API keys, etc.)
        promises.push(
          cachedGet('/api/settings').then(res => ({ type: 'settings', data: res.data || res }))
        );

        // Fetch data based on enabled widgets
        if (enabledWidgets.chores || enabledWidgets.marbles) {
          promises.push(
            cachedGet('/api/users').then(res => ({ type: 'users', data: res.data || res }))
          );
        }

        if (enabledWidgets.chores) {
          promises.push(
            cachedGet('/api/chores').then(res => ({ type: 'chores', data: res.data || res }))
          );
        }

        if (enabledWidgets.calendar) {
          promises.push(
            cachedGet('/api/events').then(res => ({ type: 'events', data: res.data || res })),
            cachedGet('/api/calendar-sources').then(res => ({ type: 'calendarSources', data: res.data || res }))
          );
        }

        if (enabledWidgets.photos) {
          promises.push(
            cachedGet('/api/photo-items').then(res => ({ type: 'photos', data: res.data || res })),
            cachedGet('/api/photo-sources').then(res => ({ type: 'photoSources', data: res.data || res }))
          );
        }

        if (enabledWidgets.todos) {
          promises.push(
            cachedGet('/api/todos').then(res => ({ type: 'todos', data: res.data || res }))
          );
        }

        if (enabledWidgets.notes) {
          promises.push(
            cachedGet('/api/notes').then(res => ({ type: 'notes', data: res.data || res }))
          );
        }

        if (enabledWidgets.alarms) {
          promises.push(
            cachedGet('/api/alarms').then(res => ({ type: 'alarms', data: res.data || res }))
          );
        }

        if (enabledWidgets.houseRules) {
          promises.push(
            cachedGet('/api/house-rules').then(res => ({ type: 'houseRules', data: res.data || res }))
          );
        }

        if (enabledWidgets.marbles) {
          promises.push(
            cachedGet('/api/marbles').then(res => ({ type: 'marbles', data: res.data || res })),
            cachedGet('/api/marbles/settings').then(res => ({ type: 'marbleSettings', data: res.data || res }))
          );
        }

        if (enabledWidgets.groceryList || enabledWidgets.mealPlanner) {
          promises.push(
            cachedGet('/api/grocery-items').then(res => ({ type: 'groceryItems', data: res.data || res }))
          );
        }

        if (enabledWidgets.mealPlanner) {
          promises.push(
            cachedGet('/api/meals').then(res => ({ type: 'meals', data: res.data || res }))
          );
        }

        if (enabledWidgets.mealSuggestionBox) {
          promises.push(
            cachedGet('/api/meal-suggestions').then(res => ({ type: 'mealSuggestions', data: res.data || res }))
          );
        }

        // Execute all requests in parallel
        const results = await Promise.allSettled(promises);

        // Process results
        const newData = {
          users: null,
          chores: null,
          events: null,
          photos: null,
          todos: null,
          notes: null,
          alarms: null,
          houseRules: null,
          marbles: null,
          groceryItems: null,
          meals: null,
          mealSuggestions: null,
          calendarSources: null,
          photoSources: null,
          settings: null,
          marbleSettings: null,
          loading: false,
          error: null
        };

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const { type, data: resultData } = result.value;
            if (type && newData.hasOwnProperty(type)) {
              newData[type] = resultData;
            }
          } else if (result.status === 'rejected') {
            console.error(`Error fetching ${promises[index]?.type || 'data'}:`, result.reason);
            // Don't set error for individual failures, just log them
          }
        });

        setData(newData);
      } catch (error) {
        console.error('Error in parallel data fetching:', error);
        setData(prev => ({ ...prev, loading: false, error: error.message }));
      }
    };

    // Only fetch if at least one widget is enabled
    const hasEnabledWidgets = Object.values(enabledWidgets).some(enabled => enabled);
    if (hasEnabledWidgets) {
      fetchAllData();
    } else {
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [enabledWidgets]);

  return data;
};
