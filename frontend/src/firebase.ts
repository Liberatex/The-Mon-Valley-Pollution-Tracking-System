import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { env, shouldUseEmulator } from './utils/env';

type FirebaseApp = ReturnType<typeof initializeApp>;
type Firestore = ReturnType<typeof getFirestore>;
type Auth = ReturnType<typeof getAuth>;

// Firebase configuration
const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: Firestore | any;
let auth: Auth | any;

app = initializeApp(firebaseConfig);
db = getFirestore(app);
auth = getAuth(app);

// Connect to emulators in development
if (shouldUseEmulator() && typeof window !== 'undefined') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('Connected to Firebase Emulators');
  } catch (error: any) {
    // Already connected, ignore
    if (!error.message?.includes('already been initial')) {
      console.warn('Could not connect to emulators:', error);
    }
  }
}

export { db, auth }; 