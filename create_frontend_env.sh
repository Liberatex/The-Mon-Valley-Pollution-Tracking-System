#!/bin/bash

# Create frontend/.env file

cat > frontend/.env << 'EOF'
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

# External API Keys (OPTIONAL - for real data)
# Get OpenWeatherMap API key from: https://openweathermap.org/api
REACT_APP_OWM_API_KEY=

# Get PurpleAir API key from: contact@purpleair.com
REACT_APP_PURPLEAIR_API_KEY=
EOF

echo "✅ Created frontend/.env file"

