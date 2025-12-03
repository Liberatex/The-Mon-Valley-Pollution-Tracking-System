# Local Testing - Mobile Map Optimization

## 🚀 Local Server Status

**Branch:** `feature/mobile-map-optimization`  
**Date:** January 2025

## Access URLs

### Frontend Development Server
- **URL:** http://localhost:3000
- **Status:** Running (Vite dev server)
- **Hot Reload:** Enabled (changes auto-refresh)

### Firebase Emulators
- **Functions:** http://127.0.0.1:5001
- **Firestore:** http://127.0.0.1:8080
- **Hosting:** http://127.0.0.1:5000
- **Emulator UI:** http://127.0.0.1:4000

## Testing Mobile Optimization

### Option 1: Browser Dev Tools (Recommended)
1. Open http://localhost:3000 in Chrome/Firefox
2. Press `F12` or `Cmd+Option+I` (Mac) to open DevTools
3. Click the device toggle icon (or press `Cmd+Shift+M`)
4. Select a mobile device (iPhone 12, Pixel 5, etc.)
5. Refresh the page
6. **Check:**
   - ✅ Map is full-width (edge-to-edge)
   - ✅ Layer controls are inside map on left side
   - ✅ Checkboxes are in 2-column grid
   - ✅ Map fills viewport height
   - ✅ Header is hidden on mobile

### Option 2: Actual Mobile Device
1. Find your computer's local IP address:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig | findstr IPv4
   ```
2. On your mobile device (same WiFi network):
   - Open browser
   - Navigate to: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

### Option 3: Network Testing
- Use ngrok or similar tool to create public URL
- Share with team for mobile testing

## What to Test

### ✅ Mobile Layout
- [ ] Map extends full width (no side padding)
- [ ] Map fills viewport height
- [ ] Layer controls overlay on left side of map
- [ ] Checkboxes in 2-column grid (horizontal layout)
- [ ] Compact labels on mobile ("Sensors" not "PurpleAir Sensors")
- [ ] Header/title hidden on mobile

### ✅ Functionality
- [ ] All checkboxes toggle layers correctly
- [ ] Map interactions work (zoom, pan, click)
- [ ] Popups display correctly (280px max width on mobile)
- [ ] Risk zones clickable
- [ ] Sensors clickable
- [ ] Facilities clickable

### ✅ Responsive Breakpoints
- [ ] Mobile (< 640px): Compact layout
- [ ] Tablet (640px - 1024px): Medium layout
- [ ] Desktop (> 1024px): Full layout with header

## Troubleshooting

### Frontend Not Loading
```bash
cd frontend
npm run dev
```

### Firebase Emulators Not Running
```bash
firebase emulators:start --only functions,firestore,hosting
```

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### Check Server Status
```bash
# Check if processes are running
ps aux | grep -E "(firebase|vite)" | grep -v grep

# Check ports
lsof -i:3000,5000,5001,8080
```

## Changes Made in This Branch

1. **Layer Controls Moved Inside Map**
   - Overlay on left side (`top-2 left-2`)
   - Semi-transparent white background with backdrop blur
   - 2-column grid on mobile

2. **Full-Width Map**
   - Removed padding on mobile (`px-0`)
   - Map height: `calc(100vh - 60px)`
   - Edge-to-edge display

3. **Compact Mobile Labels**
   - Shortened text for mobile
   - Smaller icons and checkboxes
   - Responsive text sizes

4. **Header Hidden on Mobile**
   - Title/description hidden (`hidden sm:flex`)
   - More vertical space for map

## Next Steps

1. **Test thoroughly** on mobile devices
2. **Verify all functionality** works correctly
3. **Check performance** (map rendering, interactions)
4. **Get user feedback** on layout and usability
5. **Merge to main** if approved: `git checkout feature/azure-dual-deployment && git merge feature/mobile-map-optimization`

## Rollback

If issues are found, you can easily switch back:
```bash
git checkout feature/azure-dual-deployment
```

The main branch remains unchanged and safe.

---

**Status:** ✅ Local servers running  
**Ready for testing:** Yes

