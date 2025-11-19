/**
 * Azure Provider Implementation
 * 
 * Implements Azure services (Cosmos DB, Azure AD B2C) to match the provider interface.
 * This is the NEW implementation - doesn't touch Firebase code.
 */

import { CosmosClient, Database, Container } from '@azure/cosmos';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { DatabaseProvider, CollectionReference, DocumentReference, QueryFilter } from './DatabaseProvider';
import { AuthProvider, User } from './AuthProvider';
import { env } from '../utils/env';

/**
 * Azure Cosmos DB Provider
 */
export class AzureDatabaseProvider implements DatabaseProvider {
  private client: CosmosClient;
  private database: Database;
  private databaseId: string;

  constructor(connectionString: string, databaseId: string) {
    this.client = new CosmosClient(connectionString);
    this.databaseId = databaseId;
    this.database = this.client.database(databaseId);
  }

  getCollection(collectionName: string): CollectionReference {
    const container = this.database.container(collectionName);
    
    return {
      get: async () => {
        const { resources } = await container.items.readAll().fetchAll();
        return resources;
      },
      doc: (id: string) => {
        return {
          get: async () => {
            const { resource } = await container.item(id, id).read();
            return resource;
          },
          set: async (data: any) => {
            await container.items.upsert({ id, ...data });
          },
          update: async (data: any) => {
            const item = await container.item(id, id).read();
            await container.items.upsert({ ...item.resource, ...data });
          },
          delete: async () => {
            await container.item(id, id).delete();
          },
        };
      },
      add: async (data: any) => {
        const { resource } = await container.items.create(data);
        return resource.id;
      },
      where: (field: string, operator: string, value: any) => {
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
    const container = this.database.container(collectionName);
    const { resource } = await container.item(docId, docId).read();
    return resource;
  }

  async setDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const container = this.database.container(collectionName);
    await container.items.upsert({ id: docId, ...data });
  }

  async addDocument(collectionName: string, data: any): Promise<string> {
    const container = this.database.container(collectionName);
    const { resource } = await container.items.create(data);
    return resource.id;
  }

  async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const container = this.database.container(collectionName);
    const item = await container.item(data.id || docId, data.id || docId).read();
    await container.items.upsert({ ...item.resource, ...data });
  }

  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const container = this.database.container(collectionName);
    await container.item(docId, docId).delete();
  }

  async query(collectionName: string, filters?: QueryFilter[]): Promise<any[]> {
    const container = this.database.container(collectionName);
    
    if (!filters || filters.length === 0) {
      const { resources } = await container.items.readAll().fetchAll();
      return resources;
    }

    // Build SQL query from filters
    let queryText = 'SELECT * FROM c WHERE ';
    const conditions = filters.map((filter, index) => {
      const operator = this.convertOperator(filter.operator);
      return `c.${filter.field} ${operator} @param${index}`;
    }).join(' AND ');

    queryText += conditions;
    
    const querySpec = {
      query: queryText,
      parameters: filters.map((filter, index) => ({
        name: `@param${index}`,
        value: filter.value,
      })),
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  }

  private convertOperator(operator: string): string {
    const map: Record<string, string> = {
      '==': '=',
      '!=': '!=',
      '<': '<',
      '<=': '<=',
      '>': '>',
      '>=': '>=',
      'in': 'IN',
      'array-contains': 'ARRAY_CONTAINS',
    };
    return map[operator] || operator;
  }
}

/**
 * Azure AD B2C Auth Provider
 */
export class AzureAuthProvider implements AuthProvider {
  private msalInstance: PublicClientApplication;
  private account: AccountInfo | null = null;

  constructor(clientId: string, authority: string, redirectUri: string) {
    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId,
        authority,
        redirectUri,
      },
    });
  }

  private convertAccount(account: AccountInfo | null): User | null {
    if (!account) return null;
    return {
      uid: account.localAccountId,
      email: account.username || null,
      displayName: account.name || null,
      photoURL: null,
      emailVerified: true, // Azure AD handles this
    };
  }

  async getCurrentUser(): Promise<User | null> {
    const accounts = this.msalInstance.getAllAccounts();
    this.account = accounts[0] || null;
    return this.convertAccount(this.account);
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    // Azure AD doesn't have real-time auth state changes like Firebase
    // Poll or use event listeners
    const checkAuth = async () => {
      const user = await this.getCurrentUser();
      callback(user);
    };
    
    checkAuth();
    const interval = setInterval(checkAuth, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    // Azure AD B2C uses different flow - typically redirect or popup
    throw new Error('Email/password sign-in not directly supported. Use signInWithPopup or redirect.');
  }

  async signInWithPopup(provider: string): Promise<User> {
    const loginRequest = {
      scopes: ['openid', 'profile', 'email'],
    };
    
    const response = await this.msalInstance.loginPopup(loginRequest);
    this.account = response.account || null;
    return this.convertAccount(this.account)!;
  }

  async signOut(): Promise<void> {
    if (this.account) {
      await this.msalInstance.logoutPopup({ account: this.account });
      this.account = null;
    }
  }

  async createUserWithEmail(email: string, password: string): Promise<User> {
    // Azure AD B2C handles registration through its own UI
    throw new Error('User registration handled by Azure AD B2C portal');
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    // Azure AD B2C handles password reset through its own flow
    throw new Error('Password reset handled by Azure AD B2C');
  }

  async updatePassword(newPassword: string): Promise<void> {
    // Azure AD B2C handles password updates through its own flow
    throw new Error('Password update handled by Azure AD B2C');
  }
}

/**
 * Create Azure providers
 */
export function createAzureProviders() {
  const cosmosConnectionString = env.AZURE_COSMOS_CONNECTION_STRING || '';
  const cosmosDatabaseId = env.AZURE_COSMOS_DATABASE_ID || 'mv-pollution-tracking';
  
  const azureClientId = env.AZURE_CLIENT_ID || '';
  const azureAuthority = env.AZURE_AUTHORITY || '';
  const azureRedirectUri = env.AZURE_REDIRECT_URI || window.location.origin;

  return {
    database: new AzureDatabaseProvider(cosmosConnectionString, cosmosDatabaseId),
    auth: new AzureAuthProvider(azureClientId, azureAuthority, azureRedirectUri),
  };
}

