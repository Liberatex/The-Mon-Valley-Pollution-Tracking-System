/**
 * Environment variable helper for Vite compatibility
 * Vite uses import.meta.env instead of process.env
 * This provides a unified interface
 */

// Vite exposes env variables via import.meta.env
// For backward compatibility, we'll use import.meta.env in Vite
// and fall back to process.env for other environments

const getEnvVar = (key: string, defaultValue?: string): string => {
  // In Vite, environment variables are available via import.meta.env
  // Variables must be prefixed with VITE_ to be exposed
  try {
    // @ts-ignore - import.meta is available in Vite
    if (import.meta && import.meta.env) {
      const viteKey = key.replace('REACT_APP_', 'VITE_');
      // @ts-ignore
      // Check both VITE_ prefixed version and original key
      const value = import.meta.env[viteKey] || import.meta.env[key] || import.meta.env[`REACT_APP_${key}`] || defaultValue || '';
      return value;
    }
  } catch (e) {
    // import.meta not available, fall through to process.env
  }
  
  // Fallback for Node.js environments or SSR
  // @ts-ignore - process is available in Node.js
  if (typeof process !== 'undefined' && process && process.env) {
    // @ts-ignore
    return process.env[key] || defaultValue || '';
  }
  
  return defaultValue || '';
};

// Export environment variables with REACT_APP_ prefix for backward compatibility
export const env = {
  FIREBASE_API_KEY: getEnvVar('REACT_APP_FIREBASE_API_KEY', 'test-api-key'),
  FIREBASE_AUTH_DOMAIN: getEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN', 'test-project.firebaseapp.com'),
  FIREBASE_PROJECT_ID: getEnvVar('REACT_APP_FIREBASE_PROJECT_ID', 'mv-pollution-tracking-system'),
  FIREBASE_STORAGE_BUCKET: getEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET', 'test-project.appspot.com'),
  FIREBASE_MESSAGING_SENDER_ID: getEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', '123456789'),
  FIREBASE_APP_ID: getEnvVar('REACT_APP_FIREBASE_APP_ID', 'test-app-id'),
  USE_EMULATOR: getEnvVar('REACT_APP_USE_EMULATOR') || getEnvVar('VITE_USE_EMULATOR') || 'false',
  PURPLEAIR_API_KEY: getEnvVar('REACT_APP_PURPLEAIR_API_KEY', ''),
  PROVIDER: getEnvVar('REACT_APP_PROVIDER', 'firebase'),
  // New API keys for VCAN features
  MAPBOX_ACCESS_TOKEN: getEnvVar('VITE_MAPBOX_ACCESS_TOKEN', ''),
  OPENWEATHER_API_KEY: getEnvVar('VITE_OPENWEATHER_API_KEY', ''),
  IQAIR_API_KEY: getEnvVar('VITE_IQAIR_API_KEY', ''),
  // Azure-specific variables
  AZURE_COSMOS_CONNECTION_STRING: getEnvVar('REACT_APP_AZURE_COSMOS_CONNECTION_STRING', ''),
  AZURE_COSMOS_DATABASE_ID: getEnvVar('REACT_APP_AZURE_COSMOS_DATABASE_ID', 'mv-pollution-tracking'),
  AZURE_CLIENT_ID: getEnvVar('REACT_APP_AZURE_CLIENT_ID', ''),
  AZURE_AUTHORITY: getEnvVar('REACT_APP_AZURE_AUTHORITY', ''),
  AZURE_REDIRECT_URI: getEnvVar('REACT_APP_AZURE_REDIRECT_URI', ''),
};

// Helper function to check if we're in development
export const isDevelopment = (): boolean => {
  try {
    // @ts-ignore - import.meta is available in Vite
    if (import.meta && import.meta.env) {
      // @ts-ignore
      return import.meta.env.MODE === 'development' || import.meta.env.DEV === true;
    }
  } catch (e) {
    // import.meta not available, fall through
  }
  // @ts-ignore - process is available in Node.js
  return typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
};

// Helper function to check if emulator should be used
export const shouldUseEmulator = (): boolean => {
  // Explicitly check if we're in production (hosted on Firebase)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If we're on Firebase hosting or any production domain, NEVER use emulator
    if (hostname.includes('web.app') || 
        hostname.includes('firebaseapp.com') || 
        hostname.includes('mv-pollution-tracking-system') ||
        (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168'))) {
      return false; // Always use production in hosted environment
    }
  }
  
  // Check environment variable (only applies in local development)
  if (env.USE_EMULATOR === 'true') {
    return true;
  }
  
  // In development mode, default to using emulator if running on localhost
  if (isDevelopment()) {
    // Check if we're running on localhost (development)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168')) {
        return true; // Default to emulator in local development
      }
    }
  }
  
  return false;
};

