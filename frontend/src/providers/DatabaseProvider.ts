/**
 * Database Provider Interface
 * 
 * Abstraction layer for database operations.
 * Allows switching between Firebase Firestore and Azure Cosmos DB
 * without changing component code.
 */

export interface DatabaseProvider {
  // Collection operations
  getCollection(collectionName: string): CollectionReference;
  
  // Document operations
  getDocument(collectionName: string, docId: string): Promise<any>;
  setDocument(collectionName: string, docId: string, data: any): Promise<void>;
  addDocument(collectionName: string, data: any): Promise<string>;
  updateDocument(collectionName: string, docId: string, data: any): Promise<void>;
  deleteDocument(collectionName: string, docId: string): Promise<void>;
  
  // Query operations
  query(collectionName: string, filters?: QueryFilter[]): Promise<any[]>;
}

export interface CollectionReference {
  get(): Promise<any[]>;
  doc(id: string): DocumentReference;
  add(data: any): Promise<string>;
  where(field: string, operator: string, value: any): CollectionReference;
  orderBy(field: string, direction?: 'asc' | 'desc'): CollectionReference;
  limit(count: number): CollectionReference;
}

export interface DocumentReference {
  get(): Promise<any>;
  set(data: any): Promise<void>;
  update(data: any): Promise<void>;
  delete(): Promise<void>;
}

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
  value: any;
}

