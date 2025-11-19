/**
 * Firebase Provider Implementation
 * 
 * Wraps Firebase services to match the provider interface.
 * This keeps all existing Firebase code working.
 */

import { getFirestore, Firestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, query as firestoreQuery, where, orderBy, limit, QueryConstraint } from 'firebase/firestore';
import { getAuth, Auth, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword as firebaseUpdatePassword, onAuthStateChanged as firebaseOnAuthStateChanged } from 'firebase/auth';
import { DatabaseProvider, CollectionReference, DocumentReference, QueryFilter } from './DatabaseProvider';
import { AuthProvider, User } from './AuthProvider';
import { db as firebaseDb, auth as firebaseAuth } from '../firebase';

/**
 * Firebase Database Provider
 */
export class FirebaseDatabaseProvider implements DatabaseProvider {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  getCollection(collectionName: string): CollectionReference {
    const colRef = collection(this.db, collectionName);
    
    return {
      get: async () => {
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      doc: (id: string) => {
        const docRef = doc(this.db, collectionName, id);
        return {
          get: async () => {
            const snapshot = await getDoc(docRef);
            return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
          },
          set: async (data: any) => await setDoc(docRef, data),
          update: async (data: any) => await updateDoc(docRef, data),
          delete: async () => await deleteDoc(docRef),
        };
      },
      add: async (data: any) => {
        const docRef = await addDoc(colRef, data);
        return docRef.id;
      },
      where: (field: string, operator: string, value: any) => {
        // Return a new collection reference with where clause
        // This is simplified - in real implementation, chain these
        return this.getCollection(collectionName);
      },
      orderBy: (field: string, direction?: 'asc' | 'desc') => {
        return this.getCollection(collectionName);
      },
      limit: (count: number) => {
        return this.getCollection(collectionName);
      },
    };
  }

  async getDocument(collectionName: string, docId: string): Promise<any> {
    const docRef = doc(this.db, collectionName, docId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  async setDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const docRef = doc(this.db, collectionName, docId);
    await setDoc(docRef, data);
  }

  async addDocument(collectionName: string, data: any): Promise<string> {
    const colRef = collection(this.db, collectionName);
    const docRef = await addDoc(colRef, data);
    return docRef.id;
  }

  async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const docRef = doc(this.db, collectionName, docId);
    await updateDoc(docRef, data);
  }

  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const docRef = doc(this.db, collectionName, docId);
    await deleteDoc(docRef);
  }

  async query(collectionName: string, filters?: QueryFilter[]): Promise<any[]> {
    const colRef = collection(this.db, collectionName);
    const constraints: QueryConstraint[] = [];
    
    if (filters) {
      filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
    }
    
    const q = firestoreQuery(colRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

/**
 * Firebase Auth Provider
 */
export class FirebaseAuthProvider implements AuthProvider {
  private auth: Auth;

  constructor(auth: Auth) {
    this.auth = auth;
  }

  private convertUser(firebaseUser: FirebaseUser | null): User | null {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
    };
  }

  async getCurrentUser(): Promise<User | null> {
    return this.convertUser(this.auth.currentUser);
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return firebaseOnAuthStateChanged(this.auth, (firebaseUser) => {
      callback(this.convertUser(firebaseUser));
    });
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    return this.convertUser(result.user)!;
  }

  async signInWithPopup(provider: string): Promise<User> {
    // Firebase popup sign-in implementation
    throw new Error('Popup sign-in not implemented in Firebase provider');
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async createUserWithEmail(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(this.auth, email, password);
    return this.convertUser(result.user)!;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async updatePassword(newPassword: string): Promise<void> {
    if (!this.auth.currentUser) throw new Error('No user signed in');
    await firebaseUpdatePassword(this.auth.currentUser, newPassword);
  }
}

/**
 * Create Firebase providers using existing Firebase instances
 */
export function createFirebaseProviders() {
  return {
    database: new FirebaseDatabaseProvider(firebaseDb),
    auth: new FirebaseAuthProvider(firebaseAuth),
  };
}

