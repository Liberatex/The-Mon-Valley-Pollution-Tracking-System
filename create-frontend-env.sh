#!/bin/bash
# This script creates a .env file in the frontend directory with placeholder Firebase config values.

cat > frontend/.env <<EOL
REACT_APP_FIREBASE_API_KEY=AIzaSyBi1nQFnb-g-NbZe8bvHDqXdU3Ewmy-PZM
REACT_APP_FIREBASE_AUTH_DOMAIN=mv-mv-pollution-tracking-system.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mv-pollution-tracking-system
REACT_APP_FIREBASE_STORAGE_BUCKET=mv-mv-pollution-tracking-system.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=245354192374
REACT_APP_FIREBASE_APP_ID=1:245354192374:web:14b7f86ad26b3232933bd7
EOL

echo ".env file created in frontend/ directory. Please update it with your real Firebase config values." 