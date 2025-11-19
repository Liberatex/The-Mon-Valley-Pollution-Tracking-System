/**
 * Azure Cosmos DB Container Creation
 * 
 * Creates all required containers for full Azure parity
 * Run this once after Azure setup
 */

import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient(process.env.AZURE_COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.AZURE_COSMOS_DATABASE_ID || 'mv-pollution-tracking');

/**
 * Create all required containers
 */
export async function createAllContainers(): Promise<void> {
  const containers = [
    {
      id: 'symptomReports',
      partitionKey: { paths: ['/pseudoId'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/_integrityChecksum/?' }]
      }
    },
    {
      id: 'healthAlerts',
      partitionKey: { paths: ['/status'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }]
      }
    },
    {
      id: 'titleVFacilities',
      partitionKey: { paths: ['/facilityId'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }]
      }
    },
    {
      id: 'symptomReportAggregates',
      partitionKey: { paths: ['/date'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }]
      }
    },
    {
      id: 'auditLogs',
      partitionKey: { paths: ['/timestamp'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }]
      }
    },
    {
      id: 'regulatoryReports',
      partitionKey: { paths: ['/agency'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }]
      }
    },
    {
      id: 'breachEvents',
      partitionKey: { paths: ['/status'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }]
      }
    }
  ];

  for (const containerSpec of containers) {
    try {
      await database.containers.createIfNotExists(containerSpec);
      console.log(`✅ Container created/verified: ${containerSpec.id}`);
    } catch (error: any) {
      console.error(`Error creating container ${containerSpec.id}:`, error);
      throw error;
    }
  }

  console.log('✅ All containers created successfully');
}

// Export for manual execution
if (require.main === module) {
  createAllContainers()
    .then(() => {
      console.log('✅ Container creation complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Container creation failed:', error);
      process.exit(1);
    });
}

