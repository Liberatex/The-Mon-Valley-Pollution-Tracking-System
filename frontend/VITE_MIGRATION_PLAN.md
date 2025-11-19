# Vite Migration Plan

## Current State Analysis

### Project Structure
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **TypeScript**: ✅ Already configured
- **React Version**: 19.1.0
- **Entry Point**: `src/index.tsx`
- **Public Assets**: `public/` directory

### Environment Variables (REACT_APP_ prefix)
- REACT_APP_FIREBASE_API_KEY
- REACT_APP_FIREBASE_AUTH_DOMAIN
- REACT_APP_FIREBASE_PROJECT_ID
- REACT_APP_FIREBASE_STORAGE_BUCKET
- REACT_APP_FIREBASE_MESSAGING_SENDER_ID
- REACT_APP_FIREBASE_APP_ID
- REACT_APP_USE_EMULATOR
- REACT_APP_PURPLEAIR_API_KEY
- REACT_APP_PROVIDER

### Dependencies to Migrate
- All existing dependencies will be preserved
- Need to add Vite and related plugins
- Service worker registration needs adjustment

### Files Requiring Updates
1. `package.json` - Update scripts, add Vite dependencies
2. `tsconfig.json` - Update for Vite compatibility
3. `index.html` - Move to root, update entry point
4. `src/index.tsx` - Minor adjustments
5. All files using `process.env.REACT_APP_*` - Change to `import.meta.env.VITE_*`
6. `vite.config.ts` - New file for Vite configuration

## Migration Steps

1. Install Vite and plugins
2. Create `vite.config.ts`
3. Update `tsconfig.json`
4. Move and update `index.html`
5. Update environment variable references
6. Update `package.json` scripts
7. Create `.env.example` file
8. Test the application

## Potential Issues

1. Service worker registration may need adjustment
2. Environment variables need renaming
3. Proxy configuration needs to be moved to Vite config
4. PWA features may need reconfiguration
5. Build output structure will change

