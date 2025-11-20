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
 * Get user's current location with proper error handling
 * @param onSuccess Callback when location is successfully retrieved
 * @param onError Callback when location retrieval fails
 * @param options Optional geolocation options
 */
export function getCurrentLocation(
  onSuccess: GeolocationCallback,
  onError: GeolocationErrorCallback,
  options?: PositionOptions
): void {
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

  // Default options
  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000, // Accept cached position up to 1 minute old
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Request location
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
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings and refresh the page.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorType = 'position_unavailable';
          errorMessage = 'Location information is unavailable.';
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

