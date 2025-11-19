# Local Testing Guide

## Starting the Development Server

### Option 1: Using npm (Recommended)
```bash
cd frontend
npm run dev
```

The server will start on `http://localhost:5173` (Vite default port)

### Option 2: Using npm start
```bash
cd frontend
npm start
```

## Accessing the Application

Once the server is running, open your browser and navigate to:
- **Local**: http://localhost:5173
- **Network**: The terminal will show the network URL if you want to test on other devices

## Testing Checklist

### ✅ Responsive Design
- [ ] Test on desktop (1920x1080 or larger)
- [ ] Test on tablet (768px - 1024px width)
- [ ] Test on mobile (320px - 640px width)
- [ ] Verify navigation adapts to screen size
- [ ] Check all forms are usable on mobile
- [ ] Verify charts and maps are responsive

### ✅ Core Features
- [ ] Home page loads correctly
- [ ] Dashboard displays air quality data
- [ ] Sensor Map shows markers correctly
- [ ] Symptom Report form is functional
- [ ] Evidence Report generation works
- [ ] AI Assistant responds
- [ ] Exposure Model calculates correctly

### ✅ Performance
- [ ] Page transitions are smooth
- [ ] Lazy loading works (check Network tab)
- [ ] No console errors
- [ ] Images load properly

### ✅ Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (if testing)
- [ ] Focus states visible
- [ ] Color contrast adequate

## Troubleshooting

### Server won't start
1. Check if port 5173 is already in use: `lsof -ti:5173`
2. Kill existing process: `pkill -f vite`
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check for TypeScript errors: `npm run build`

### Build Errors
- Azure packages missing: They're optional, only needed for Azure deployment
- TypeScript errors: Check `tsconfig.json` settings
- Import errors: Verify all imports are correct

### Firebase Emulator
If using Firebase emulator, make sure it's running:
```bash
firebase emulators:start
```

## Environment Variables

Create a `.env` file in the `frontend` directory:
```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_USE_EMULATOR=true
VITE_PROVIDER=firebase
```

## Next Steps After Local Testing

1. ✅ Verify all features work
2. ✅ Test responsive design
3. ✅ Check performance
4. ✅ Fix any issues found
5. ✅ Deploy to staging/production

