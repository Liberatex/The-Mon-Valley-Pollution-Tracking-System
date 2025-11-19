/**
 * Provider Factory
 * 
 * Switches between Firebase and Azure based on environment variable.
 * Components import from here instead of directly from firebase.ts
 */

import { createFirebaseProviders } from './FirebaseProvider';
import { createAzureProviders } from './AzureProvider';
import { DatabaseProvider } from './DatabaseProvider';
import { AuthProvider } from './AuthProvider';
import { env } from '../utils/env';

export interface Providers {
  database: DatabaseProvider;
  auth: AuthProvider;
}

let providers: Providers | null = null;

/**
 * Get the active provider (Firebase or Azure)
 */
export function getProviders(): Providers {
  if (providers) {
    return providers;
  }

  const providerType = env.PROVIDER || 'firebase';
  
  console.log(`Initializing ${providerType} providers...`);

  if (providerType === 'azure') {
    providers = createAzureProviders();
    console.log('Azure providers initialized');
  } else {
    providers = createFirebaseProviders();
    console.log('Firebase providers initialized');
  }

  return providers;
}

/**
 * Get database instance (replaces direct Firebase import)
 */
export function getDatabase(): DatabaseProvider {
  return getProviders().database;
}

/**
 * Get auth instance (replaces direct Firebase import)
 */
export function getAuth(): AuthProvider {
  return getProviders().auth;
}

/**
 * Reset providers (useful for testing or switching at runtime)
 */
export function resetProviders(): void {
  providers = null;
}

// Export for convenience (matches Firebase API)
export const db = getDatabase();
export const auth = getAuth();

