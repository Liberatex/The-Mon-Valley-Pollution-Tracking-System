import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

type FirebaseApp = ReturnType<typeof initializeApp>;
type Firestore = ReturnType<typeof getFirestore>;
type Auth = ReturnType<typeof getAuth>;

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'test-api-key',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'test-project.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'mv-pollution-tracking-system',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'test-project.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'test-app-id',
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: Firestore | any;
let auth: Auth | any;

app = initializeApp(firebaseConfig);
db = getFirestore(app);
auth = getAuth(app);

// Connect to emulators in development
if (process.env.REACT_APP_USE_EMULATOR === 'true' && typeof window !== 'undefined') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('🔧 Connected to Firebase Emulators');
  } catch (error: any) {
    // Already connected, ignore
    if (!error.message?.includes('already been initial')) {
      console.warn('Could not connect to emulators:', error);
    }
  }
}

export { db, auth }; 