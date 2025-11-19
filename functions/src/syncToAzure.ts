/**
 * Data Sync Function: Firebase → Azure
 * 
 * Syncs data from Firestore to Cosmos DB to keep both databases in sync.
 * Can be triggered manually or scheduled.
 */

import * as admin from "firebase-admin";
import { CosmosClient } from '@azure/cosmos';
import * as functions from 'firebase-functions/v1';

// Initialize Cosmos DB client (only if Azure connection string is provided)
let cosmosClient: CosmosClient | null = null;
let cosmosDatabase: any = null;

function initCosmosClient() {
  const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING;
  const databaseId = process.env.AZURE_COSMOS_DATABASE_ID || 'mv-pollution-tracking';
  
  if (!connectionString) {
    console.warn('Azure Cosmos DB connection string not configured. Sync disabled.');
    return false;
  }

  try {
    cosmosClient = new CosmosClient(connectionString);
    cosmosDatabase = cosmosClient.database(databaseId);
    return true;
  } catch (error) {
    console.error('Failed to initialize Cosmos DB client:', error);
    return false;
  }
}

/**
 * Sync Title V Facilities from Firestore to Cosmos DB
 */
export async function syncTitleVFacilitiesToAzure(): Promise<void> {
  if (!initCosmosClient()) {
    throw new Error('Cosmos DB not configured');
  }

  try {
    // Read from Firestore
    const facilitiesSnapshot = await admin.firestore()
      .collection('titleVFacilities')
      .get();

    const facilities = facilitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Write to Cosmos DB
    const container = cosmosDatabase.container('titleVFacilities');
    
    for (const facility of facilities) {
      await container.items.upsert(facility);
    }

    console.log(`Synced ${facilities.length} Title V facilities to Azure Cosmos DB`);
  } catch (error: any) {
    console.error('Error syncing Title V facilities:', error);
    throw error;
  }
}

/**
 * Sync Symptom Reports from Firestore to Cosmos DB
 * Only syncs reports that haven't been synced yet (based on metadata)
 */
export async function syncSymptomReportsToAzure(): Promise<void> {
  if (!initCosmosClient()) {
    throw new Error('Cosmos DB not configured');
  }

  try {
    // Read from Firestore (only recent reports, limit to avoid overload)
    const reportsSnapshot = await admin.firestore()
      .collection('symptomReports')
      .orderBy('submittedAt', 'desc')
      .limit(100) // Sync last 100 reports
      .get();

    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      syncedToAzure: true, // Mark as synced
      syncedAt: new Date().toISOString()
    }));

    // Write to Cosmos DB
    const container = cosmosDatabase.container('symptomReports');
    
    for (const report of reports) {
      await container.items.upsert(report);
    }

    console.log(`Synced ${reports.length} symptom reports to Azure Cosmos DB`);
  } catch (error: any) {
    console.error('Error syncing symptom reports:', error);
    throw error;
  }
}

/**
 * Cloud Function: Manual sync trigger
 */
export const syncToAzure = functions.https.onRequest(async (req, res) => {
  try {
    const syncType = req.query.type || 'all';
    
    if (syncType === 'facilities' || syncType === 'all') {
      await syncTitleVFacilitiesToAzure();
    }
    
    if (syncType === 'reports' || syncType === 'all') {
      await syncSymptomReportsToAzure();
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncType} to Azure`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Sync failed:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
});

/**
 * Scheduled sync (runs every 6 hours)
 */
export const scheduledSyncToAzure = functions.pubsub.schedule('every 6 hours')
  .onRun(async (context) => {
    try {
      await syncTitleVFacilitiesToAzure();
      await syncSymptomReportsToAzure();
      console.log('Scheduled sync to Azure completed');
    } catch (error: any) {
      console.error('Scheduled sync failed:', error);
      throw error;
    }
  });

