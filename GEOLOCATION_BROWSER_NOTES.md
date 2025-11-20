# Geolocation Browser-Specific Behavior

## ✅ Status: Working

The "My Location" feature is working correctly. Geolocation permission handling varies by browser:

### Browser Differences

1. **Chrome/Edge**: 
   - Shows permission prompt on first request
   - If denied, user must manually enable via browser settings (lock icon in address bar)
   - Once granted, remembers permission for the site

2. **Firefox**:
   - Similar to Chrome, but may show prompt again after denial if user clears site data

3. **Safari**:
   - More restrictive - requires HTTPS
   - May require user to enable location services in macOS/iOS settings first
   - Once denied, must be manually enabled in browser settings

### User Instructions

If location access is denied:
1. **Click the lock icon** in the browser's address bar
2. **Enable location permissions** for the site
3. **Refresh the page** and try again

### Technical Notes

- The geolocation utility (`utils/geolocation.ts`) always attempts to request location, allowing the browser to show its native permission prompt
- `maximumAge: 0` ensures fresh location requests, which helps trigger permission prompts
- `enableHighAccuracy: false` provides faster, more reliable results on mobile devices
- The Permissions API check is informational only - we don't block requests based on it

### Firebase API Key Warning

The `test-api-key` warning in the console is harmless if Firebase Auth isn't being used. To fix it for production:

1. Set environment variables in Firebase Hosting build configuration
2. Or configure Firebase config directly in the build process

This doesn't affect geolocation functionality.

