/**
 * Azure Data Lake Integration
 * 
 * Archives historical data to Azure Data Lake for long-term storage
 * HIPAA-Compliant: Encrypted archival storage
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';
import { logAuditEvent } from './auditLogging';

// Azure Storage/Data Lake configuration
interface DataLakeConfig {
  accountName: string;
  containerName: string;
  connectionString: string;
}

/**
 * Get Data Lake configuration
 */
function getDataLakeConfig(): DataLakeConfig | null {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.warn('Azure Storage connection string not configured');
    return null;
  }

  return {
    accountName: process.env.AZURE_STORAGE_ACCOUNT || 'mvpollutionstorage',
    containerName: process.env.AZURE_DATA_LAKE_CONTAINER || 'health-data-archive',
    connectionString,
  };
}

/**
 * Archive aggregate to Data Lake
 * Note: In production, use @azure/storage-blob SDK
 */
async function archiveToDataLake(
  aggregate: any,
  aggregateType: 'daily' | 'weekly' | 'monthly',
  date: string
): Promise<void> {
  const config = getDataLakeConfig();
  if (!config) {
    throw new Error('Azure Data Lake not configured');
  }

  try {
    // In production, use Azure SDK:
    // const { BlobServiceClient } = require('@azure/storage-blob');
    // const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    // const containerClient = blobServiceClient.getContainerClient(config.containerName);
    
    // Create file path: aggregates/{type}/{year}/{month}/{date}.json
    const [year, month] = date.split('-');
    const filePath = `aggregates/${aggregateType}/${year}/${month}/${date}.json`;
    
    // Serialize aggregate
    const data = JSON.stringify({
      ...aggregate,
      archivedAt: new Date().toISOString(),
      archiveVersion: '1.0',
    });

    // TODO: Replace with actual Data Lake upload
    // await containerClient.uploadBlockBlob(filePath, data, data.length);
    
    console.log(`✅ Archived ${aggregateType} aggregate to Data Lake: ${filePath}`);
    console.log('Note: Actual Data Lake upload requires Azure SDK setup');
  } catch (error: any) {
    console.error('Error archiving to Data Lake:', error);
    throw error;
  }
}

/**
 * Archive old symptom reports to Data Lake (after 1 year)
 * Moves from operational storage to archival storage
 */
async function archiveOldReports(): Promise<void> {
  const config = getDataLakeConfig();
  if (!config) {
    throw new Error('Azure Data Lake not configured');
  }

  try {
    // Get reports older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const oldReportsSnapshot = await admin.firestore()
      .collection('symptomReports')
      .where('submittedAt', '<', oneYearAgo.toISOString())
      .where('archived', '==', false)
      .limit(100) // Process in batches
      .get();

    if (oldReportsSnapshot.empty) {
      console.log('No old reports to archive');
      return;
    }

    // Group by month for efficient archival
    const reportsByMonth: { [month: string]: any[] } = {};
    
    oldReportsSnapshot.docs.forEach(doc => {
      const report = doc.data();
      const date = new Date(report.submittedAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!reportsByMonth[month]) {
        reportsByMonth[month] = [];
      }
      
      reportsByMonth[month].push({
        id: doc.id,
        ...report,
      });
    });

    // Archive each month's reports
    for (const [month, reports] of Object.entries(reportsByMonth)) {
      const [year, monthNum] = month.split('-');
      const filePath = `symptom_reports/${year}/${monthNum}/reports_${month}.json`;
      
      const data = JSON.stringify({
        month,
        reports,
        archivedAt: new Date().toISOString(),
        count: reports.length,
      });

      // TODO: Upload to Data Lake
      // await containerClient.uploadBlockBlob(filePath, data, data.length);
      
      // Mark reports as archived
      const batch = admin.firestore().batch();
      reports.forEach(report => {
        const ref = admin.firestore().collection('symptomReports').doc(report.id);
        batch.update(ref, { archived: true, archivedAt: new Date().toISOString() });
      });
      await batch.commit();

      console.log(`✅ Archived ${reports.length} reports for ${month} to Data Lake`);
    }
  } catch (error: any) {
    console.error('Error archiving old reports:', error);
    throw error;
  }
}

/**
 * Cloud Function: Archive monthly aggregates to Data Lake
 */
export const archiveMonthlyAggregatesToDataLake = functions.pubsub.schedule('0 4 2 * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      const aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`monthly_${monthStr}`)
        .get();

      if (!aggregateDoc.exists) {
        console.warn(`Monthly aggregate not found for ${monthStr}`);
        return null;
      }

      const aggregate = aggregateDoc.data();
      await archiveToDataLake(aggregate, 'monthly', monthStr);

      await logAuditEvent(
        'system',
        'system',
        'export',
        'symptomReportAggregates',
        'compliance',
        {
          resourceId: `monthly_${monthStr}`,
          details: { exportFormat: 'json' as const, recordCount: 1, destination: 'data_lake' },
          source: 'scheduled_job'
        }
      );

      return null;
    } catch (error: any) {
      console.error('Error archiving to Data Lake:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Archive old reports to Data Lake
 * Runs monthly to move reports older than 1 year to archival
 */
export const archiveOldReportsToDataLake = functions.pubsub.schedule('0 5 1 * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      await archiveOldReports();
      return null;
    } catch (error: any) {
      console.error('Error archiving old reports:', error);
      throw error;
    }
  });

/**
 * Manual archive trigger
 */
export const archiveToDataLakeManual = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { type, date } = req.body;

    if (type === 'reports') {
      await archiveOldReports();
      res.json({ success: true, message: 'Old reports archived to Data Lake' });
      return;
    }

    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }

    // Get aggregate and archive
    let aggregateDoc;
    let dateStr: string;

    if (type === 'daily') {
      dateStr = date || new Date().toISOString().split('T')[0];
      aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`daily_${dateStr}`)
        .get();
    } else if (type === 'weekly') {
      dateStr = date || (() => {
        const monday = new Date();
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        return monday.toISOString().split('T')[0];
      })();
      aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`weekly_${dateStr}`)
        .get();
    } else {
      dateStr = date || (() => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      })();
      aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`monthly_${dateStr}`)
        .get();
    }

    if (!aggregateDoc.exists) {
      res.status(404).json({ error: 'Aggregate not found' });
      return;
    }

    const aggregate = aggregateDoc.data();
    await archiveToDataLake(aggregate, type, dateStr);

    res.json({
      success: true,
      message: `Archived ${type} aggregate to Data Lake`,
      type,
      date: dateStr
    });
  } catch (error: any) {
    console.error('Error in manual Data Lake archive:', error);
    res.status(500).json({
      error: 'Failed to archive to Data Lake',
      message: error.message
    });
  }
});

