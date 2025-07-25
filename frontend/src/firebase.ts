import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration with fallbacks for testing
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'test-api-key',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'test-project.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'test-project',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'test-project.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'test-app-id',
};

// Initialize Firebase only if we're not in test environment
let app: FirebaseApp | undefined;
let db: Firestore | any;
let auth: Auth | any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  // In test environment, provide mock objects
  if (process.env.NODE_ENV === 'test') {
    db = {} as any;
    auth = {} as any;
  } else {
    throw error;
  }
}

export { db, auth }; 