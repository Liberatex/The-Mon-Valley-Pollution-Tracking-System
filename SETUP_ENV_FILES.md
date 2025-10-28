# Environment Files Setup

## Problem

The `.env` files are being blocked by `.gitignore` and need to be created manually.

## Solution: Create These Files Manually

### 1. Create `functions/.env`

**File Location**: `/functions/.env`

**Content**:
```env
# EPA AQS Credentials for ACHD data
EPA_AQS_EMAIL=bjyusuph@gmail.com
EPA_AQS_KEY=indigoosprey88

# OpenAQ API Key  
OPENAQ_API_KEY=5724d18070a5d68251feba85b1d12b58

# Admin Secret
ADMIN_SECRET=test-admin-secret
```

### 2. Create `frontend/.env`

**File Location**: `/frontend/.env`

**Content**:
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyTestKey123
REACT_APP_FIREBASE_AUTH_DOMAIN=mv-pollution-tracking-system.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mv-pollution-tracking-system
REACT_APP_FIREBASE_STORAGE_BUCKET=mv-pollution-tracking-system.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=test-app-id

# Use emulators in development
REACT_APP_USE_EMULATOR=true
REACT_APP_FUNCTIONS_EMULATOR_URL=http://localhost:5001/mv-pollution-tracking-system/us-central1
REACT_APP_FIRESTORE_EMULATOR_HOST=localhost:8080

# External API Keys (ADD YOUR KEYS HERE)
REACT_APP_OWM_API_KEY=
REACT_APP_PURPLEAIR_API_KEY=YOUR_PURPLEAIR_KEY_HERE
```

## How to Create

### Option 1: Using Terminal

```bash
# For functions
cd functions
nano .env
# Paste the content above, save (Ctrl+X, Y, Enter)

# For frontend
cd ../frontend
nano .env
# Paste the content above, save
```

### Option 2: Using Your Code Editor

1. In your IDE, right-click the `functions` folder
2. Select "New File"
3. Name it `.env`
4. Paste the content from above
5. Repeat for `frontend` folder

## After Creating

1. **Restart Emulators** (to pick up functions/.env)
   ```bash
   pkill -f "firebase emulators"
   firebase emulators:start --only functions,firestore
   ```

2. **Restart Frontend** (to pick up frontend/.env)
   ```bash
   pkill -f "react-scripts"
   cd frontend && npm start
   ```

## Verify It Works

1. **Check Dashboard** (http://localhost:3000)
   - Should show real ACHD data (not mock)
   - Browser console: "✅ Using official ACHD data"

2. **Check Map** (Sensor Map page)
   - Should show real PurpleAir sensors (if API key added)
   - Or mock sensors (if no API key)

## Troubleshooting

If files won't create:
- Make sure you're in the correct directory
- Check file permissions
- Some editors hide dotfiles by default (Ctrl+Shift+. to show in VS Code)

