// API utility functions
// Get the API URL with fallback for development
export const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;
  
  if (!apiUrl || apiUrl === 'undefined') {
    // Fallback for local development
    const defaultUrl = 'http://localhost:5001';
    console.warn(`VITE_REACT_APP_API_URL is not set. Using fallback: ${defaultUrl}`);
    console.warn('Please create a .env file in the client directory with:');
    console.warn('VITE_REACT_APP_API_URL=http://localhost:5001');
    return defaultUrl;
  }
  
  return apiUrl;
};
