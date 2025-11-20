/**
 * Shared geolocation utility for consistent location handling across components
 * Handles permission denial, errors, and retries properly
 */

export interface GeolocationResult {
  lat: number;
  lng: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  type: 'permission_denied' | 'position_unavailable' | 'timeout' | 'not_supported' | 'not_secure';
}

export type GeolocationCallback = (result: GeolocationResult) => void;
export type GeolocationErrorCallback = (error: GeolocationError) => void;

/**
 * Check geolocation permission status using Permissions API if available
 */
async function checkPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  // Use Permissions API if available (Chrome, Edge, etc.)
  if ('permissions' in navigator && 'query' in navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state;
    } catch (e) {
      // Permissions API not fully supported or geolocation not in spec
      return 'unknown';
    }
  }
  return 'unknown';
}

/**
 * Get user's current location with proper error handling
 * Always allows browser to show permission prompt
 * @param onSuccess Callback when location is successfully retrieved
 * @param onError Callback when location retrieval fails
 * @param options Optional geolocation options
 */
export async function getCurrentLocation(
  onSuccess: GeolocationCallback,
  onError: GeolocationErrorCallback,
  options?: PositionOptions
): Promise<void> {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    onError({
      code: 0,
      message: 'Geolocation is not supported by your browser.',
      type: 'not_supported'
    });
    return;
  }

  // Check if we're on HTTPS or localhost (required for geolocation)
  const isSecure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
  
  if (!isSecure) {
    onError({
      code: 0,
      message: 'Geolocation requires HTTPS. Please access the site via HTTPS.',
      type: 'not_secure'
    });
    return;
  }

  // Check permission status (but don't block - let browser show prompt)
  const permissionStatus = await checkPermissionStatus();
  if (permissionStatus === 'denied') {
    // Permission was previously denied, but we'll still try to trigger the prompt
    // The browser might allow the user to change their mind
    console.warn('Geolocation permission was previously denied, but attempting request anyway');
  }

  // Default options - use shorter timeout and fresher data for better UX
  const defaultOptions: PositionOptions = {
    enableHighAccuracy: false, // Changed to false - faster and works better on mobile
    timeout: 10000, // Reduced timeout for faster feedback
    maximumAge: 0, // Always get fresh location to trigger permission prompt if needed
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Request location - this will trigger browser permission prompt if needed
  navigator.geolocation.getCurrentPosition(
    (position) => {
      onSuccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error: GeolocationPositionError) => {
      let errorType: GeolocationError['type'] = 'position_unavailable';
      let errorMessage = 'Unable to retrieve your location';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorType = 'permission_denied';
          // More helpful message with instructions
          errorMessage = 'Location access denied. Please click the lock icon in your browser\'s address bar, enable location permissions, and try again.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorType = 'position_unavailable';
          errorMessage = 'Location information is unavailable. Please check your device\'s location settings.';
          break;
        case error.TIMEOUT:
          errorType = 'timeout';
          errorMessage = 'Location request timed out. Please try again.';
          break;
      }

      onError({
        code: error.code,
        message: errorMessage,
        type: errorType,
      });
    },
    finalOptions
  );
}

/**
 * Check if geolocation is available and secure
 */
export function isGeolocationAvailable(): boolean {
  if (!navigator.geolocation) return false;
  
  const isSecure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
  
  return isSecure;
}

