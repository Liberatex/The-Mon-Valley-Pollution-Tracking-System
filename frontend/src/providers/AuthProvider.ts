/**
 * Authentication Provider Interface
 * 
 * Abstraction layer for authentication operations.
 * Allows switching between Firebase Auth and Azure AD B2C
 * without changing component code.
 */

export interface AuthProvider {
  // Current user
  getCurrentUser(): Promise<User | null>;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  
  // Sign in/out
  signInWithEmail(email: string, password: string): Promise<User>;
  signInWithPopup(provider: string): Promise<User>;
  signOut(): Promise<void>;
  
  // Registration
  createUserWithEmail(email: string, password: string): Promise<User>;
  
  // Password management
  sendPasswordResetEmail(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

