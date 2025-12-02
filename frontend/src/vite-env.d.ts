/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_USE_EMULATOR: string;
  readonly VITE_PURPLEAIR_API_KEY: string;
  readonly VITE_PROVIDER: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  readonly VITE_OPENWEATHER_API_KEY: string;
  readonly VITE_IQAIR_API_KEY: string;
  // Legacy support for REACT_APP_ prefix
  readonly REACT_APP_FIREBASE_API_KEY?: string;
  readonly REACT_APP_FIREBASE_AUTH_DOMAIN?: string;
  readonly REACT_APP_FIREBASE_PROJECT_ID?: string;
  readonly REACT_APP_FIREBASE_STORAGE_BUCKET?: string;
  readonly REACT_APP_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly REACT_APP_FIREBASE_APP_ID?: string;
  readonly REACT_APP_USE_EMULATOR?: string;
  readonly REACT_APP_PURPLEAIR_API_KEY?: string;
  readonly REACT_APP_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

