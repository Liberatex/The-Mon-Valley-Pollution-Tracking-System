# Troubleshooting: Changes Not Visible

## Issue
Changes made to the code are not appearing in the browser, even though the build succeeds.

## Common Causes

### 1. **Browser Cache** (Most Common)
The browser is serving cached JavaScript files instead of the new build.

**Solution:**
1. **Hard Refresh:**
   - **Chrome/Edge:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - **Firefox:** `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - **Safari:** `Cmd+Option+R`

2. **Clear Browser Cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

3. **Disable Cache in DevTools:**
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Disable cache"
   - Keep DevTools open while testing

### 2. **Dev Server Not Restarted**
The development server needs to be restarted to pick up changes.

**Solution:**
1. Stop the dev server (Ctrl+C)
2. Restart: `npm run dev` or `npm start`
3. Wait for "compiled successfully" message

### 3. **Build Not Updated**
The production build might be outdated.

**Solution:**
```bash
cd frontend
npm run build
# Then restart your server
```

### 4. **Service Worker Cache**
If using a service worker, it might be caching old files.

**Solution:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers"
4. Click "Unregister" for any registered workers
5. Refresh the page

## Verification Steps

### Check Console Logs
After refreshing, check the browser console for:

1. **Sensor Rendering:**
   ```
   🔍 Sensor rendering check: { mapReady: true, showSensors: true, sensorsCount: 177, ... }
   🔄 Calculating weighted risk for 177 sensors...
   ✅ Creating new sensor source with 177 sensors
   ✅ Adding sensor-points layer to map
   ```

2. **Risk Zones:**
   ```
   🔄 Generating risk zones from 177 sensors...
   ✅ Detected X pollution events using weighted risk algorithm
   ```

3. **Formula Display:**
   - Check Exposure Risk page
   - Should show: `Risk Index = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user`
   - NOT: `Exposure Risk = PM2.5 Concentration ÷ Distance from Facility`

### Check Network Tab
1. Open DevTools → Network tab
2. Refresh page
3. Look for `main.js` or `index.js`
4. Check the "Size" column - if it shows "(from disk cache)", the cache is being used
5. Right-click → "Clear browser cache" and refresh

## Quick Fix Checklist

- [ ] Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] Clear browser cache
- [ ] Restart dev server (`npm run dev`)
- [ ] Check console for error messages
- [ ] Verify build completed successfully (`npm run build`)
- [ ] Check Network tab for cached files
- [ ] Disable service worker if present
- [ ] Try incognito/private browsing mode

## If Still Not Working

1. **Check File Timestamps:**
   ```bash
   ls -la frontend/dist/*.js
   ```
   Files should have recent timestamps

2. **Check Build Output:**
   ```bash
   cd frontend
   npm run build
   ```
   Look for any errors or warnings

3. **Check Browser Console:**
   - Look for JavaScript errors
   - Check if files are loading correctly
   - Verify API calls are working

4. **Verify Code Changes:**
   ```bash
   grep -n "Risk Index = \[" frontend/src/components/ExposureModel.tsx
   ```
   Should show line 597 with the new formula

## Expected Behavior After Fix

✅ **Sensors:** Should appear as colored circles on the map (green/yellow/orange/red/purple based on risk level)

✅ **Risk Zones:** Should appear as colored polygons when sensors have riskIndex >= 25

✅ **Formula:** Exposure Risk page should show the weighted risk formula, not the old distance-based formula

✅ **Console Logs:** Should show sensor rendering and risk calculation messages

---

## Still Having Issues?

If changes still aren't visible after trying all the above:

1. Check git status to ensure files were saved
2. Verify you're looking at the correct URL/port
3. Check if multiple dev servers are running
4. Restart your computer (sometimes helps with cache issues)


