/**
 * Custom hook for widgets to listen for soft refresh events
 * Automatically refetches data when soft refresh is triggered
 */
import { useEffect } from 'react';

/**
 * Hook that listens for soft refresh events and calls the provided refresh function
 * @param {Function} refreshFunction - Function to call when soft refresh is triggered
 * @param {Array} dependencies - Optional dependencies array (defaults to empty array)
 */
export const useSoftRefresh = (refreshFunction, dependencies = []) => {
  useEffect(() => {
    const handleSoftRefresh = () => {
      console.log('[useSoftRefresh] Soft refresh triggered');
      if (typeof refreshFunction === 'function') {
        refreshFunction();
      }
    };

    window.addEventListener('softRefresh', handleSoftRefresh);
    return () => window.removeEventListener('softRefresh', handleSoftRefresh);
  }, [refreshFunction, ...dependencies]);
};

export default useSoftRefresh;
