/**
 * BigQuery Export Function
 * 
 * Exports aggregated health data to BigQuery for analytics
 * HIPAA-Compliant: Only aggregated data (no PHI)
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';
import { BigQuery } from '@google-cloud/bigquery';
import { logAuditEvent } from './auditLogging';

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID || 'mv-pollution-tracking-system',
});

const DATASET_ID = 'health_data_warehouse';
const TABLE_ID = 'symptom_report_aggregates';

/**
 * Ensure BigQuery dataset and table exist
 */
async function ensureBigQuerySetup(): Promise<void> {
  try {
    // Create dataset if it doesn't exist
    const [datasets] = await bigquery.getDatasets();
    const datasetExists = datasets.some(ds => ds.id === DATASET_ID);

    if (!datasetExists) {
      await bigquery.createDataset(DATASET_ID, {
        location: 'US',
        description: 'HIPAA-compliant health data warehouse for Mon Valley Pollution Tracking',
        labels: {
          'hipaa-compliant': 'true',
          'data-type': 'aggregated-health',
        },
      });
      console.log(`✅ Created BigQuery dataset: ${DATASET_ID}`);
    }

    // Create table if it doesn't exist
    const dataset = bigquery.dataset(DATASET_ID);
    const [tables] = await dataset.getTables();
    const tableExists = tables.some(t => t.id === TABLE_ID);

    if (!tableExists) {
      const schema = [
        { name: 'date', type: 'DATE', mode: 'REQUIRED' },
        { name: 'aggregate_type', type: 'STRING', mode: 'REQUIRED' }, // daily, weekly, monthly
        { name: 'total_reports', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'symptoms', type: 'JSON', mode: 'NULLABLE' }, // { "cough": 23, "wheezing": 12 }
        { name: 'severity_mild', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'severity_moderate', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'severity_severe', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'severity_very_severe', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'severity_extreme', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'geographic', type: 'JSON', mode: 'NULLABLE' }, // { "15227": 15, "15210": 20 }
        { name: 'avg_pm25', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'max_pm25', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'correlation_score', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'week_start', type: 'DATE', mode: 'NULLABLE' }, // For weekly aggregates
        { name: 'week_end', type: 'DATE', mode: 'NULLABLE' },
        { name: 'month', type: 'STRING', mode: 'NULLABLE' }, // YYYY-MM for monthly
        { name: 'report_growth', type: 'FLOAT', mode: 'NULLABLE' }, // % change for monthly
        { name: 'symptom_trends', type: 'JSON', mode: 'NULLABLE' }, // % change per symptom
        { name: 'generated_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ];

      await dataset.createTable(TABLE_ID, {
        schema,
        description: 'Aggregated symptom report data (no PHI)',
        labels: {
          'hipaa-compliant': 'true',
          'data-type': 'aggregated',
          'retention': '7-years',
        },
      });
      console.log(`✅ Created BigQuery table: ${TABLE_ID}`);
    }
  } catch (error: any) {
    console.error('Error setting up BigQuery:', error);
    throw error;
  }
}

/**
 * Export aggregate to BigQuery
 */
async function exportAggregateToBigQuery(
  aggregate: any,
  aggregateType: 'daily' | 'weekly' | 'monthly'
): Promise<void> {
  try {
    await ensureBigQuerySetup();

    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);

    // Transform aggregate to BigQuery row format
    const row: any = {
      date: aggregate.date || aggregate.weekStart || aggregate.month,
      aggregate_type: aggregateType,
      total_reports: aggregate.totalReports,
      symptoms: JSON.stringify(aggregate.symptoms || {}),
      severity_mild: aggregate.severity?.mild || 0,
      severity_moderate: aggregate.severity?.moderate || 0,
      severity_severe: aggregate.severity?.severe || 0,
      severity_very_severe: aggregate.severity?.very_severe || 0,
      severity_extreme: aggregate.severity?.extreme || 0,
      geographic: JSON.stringify(aggregate.geographic || {}),
      avg_pm25: aggregate.avgPM25,
      max_pm25: aggregate.maxPM25,
      correlation_score: aggregate.correlationScore,
      generated_at: new Date().toISOString(),
    };

    // Add type-specific fields
    if (aggregateType === 'weekly') {
      row.week_start = aggregate.weekStart;
      row.week_end = aggregate.weekEnd;
    } else if (aggregateType === 'monthly') {
      row.month = aggregate.month;
      row.report_growth = aggregate.trends?.reportGrowth;
      row.symptom_trends = JSON.stringify(aggregate.trends?.symptomTrends || {});
    }

    // Insert row
    await table.insert([row]);

    console.log(`✅ Exported ${aggregateType} aggregate to BigQuery: ${row.date}`);
  } catch (error: any) {
    console.error('Error exporting to BigQuery:', error);
    throw error;
  }
}

/**
 * Cloud Function: Export daily aggregates to BigQuery
 * Runs after daily aggregation
 */
export const exportDailyAggregatesToBigQuery = functions.pubsub.schedule('0 1 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      // Get daily aggregate from Firestore
      const aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`daily_${dateStr}`)
        .get();

      if (!aggregateDoc.exists) {
        console.warn(`Daily aggregate not found for ${dateStr}`);
        return null;
      }

      const aggregate = aggregateDoc.data();
      await exportAggregateToBigQuery(aggregate, 'daily');

      // Log export
      await logAuditEvent(
        'system',
        'system',
        'export',
        'symptomReportAggregates',
        'analytics',
        {
          resourceId: `daily_${dateStr}`,
          details: { exportFormat: 'json' as const, recordCount: 1, destination: 'bigquery' },
          source: 'scheduled_job'
        }
      );

      return null;
    } catch (error: any) {
      console.error('Error exporting to BigQuery:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Export weekly aggregates to BigQuery
 */
export const exportWeeklyAggregatesToBigQuery = functions.pubsub.schedule('0 2 * * 1')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const lastMonday = new Date();
      const day = lastMonday.getDay();
      const diff = lastMonday.getDate() - day + (day === 0 ? -6 : 1);
      lastMonday.setDate(diff);
      const weekStartStr = lastMonday.toISOString().split('T')[0];

      const aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`weekly_${weekStartStr}`)
        .get();

      if (!aggregateDoc.exists) {
        console.warn(`Weekly aggregate not found for ${weekStartStr}`);
        return null;
      }

      const aggregate = aggregateDoc.data();
      await exportAggregateToBigQuery(aggregate, 'weekly');

      await logAuditEvent(
        'system',
        'system',
        'export',
        'symptomReportAggregates',
        'analytics',
        {
          resourceId: `weekly_${weekStartStr}`,
          details: { exportFormat: 'json' as const, recordCount: 1, destination: 'bigquery' },
          source: 'scheduled_job'
        }
      );

      return null;
    } catch (error: any) {
      console.error('Error exporting to BigQuery:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Export monthly aggregates to BigQuery
 */
export const exportMonthlyAggregatesToBigQuery = functions.pubsub.schedule('0 3 2 * *')
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
      await exportAggregateToBigQuery(aggregate, 'monthly');

      await logAuditEvent(
        'system',
        'system',
        'export',
        'symptomReportAggregates',
        'analytics',
        {
          resourceId: `monthly_${monthStr}`,
          details: { exportFormat: 'json' as const, recordCount: 1, destination: 'bigquery' },
          source: 'scheduled_job'
        }
      );

      return null;
    } catch (error: any) {
      console.error('Error exporting to BigQuery:', error);
      throw error;
    }
  });

/**
 * Manual export trigger
 */
export const exportToBigQueryManual = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { type, date } = req.body;

    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      res.status(400).json({ error: 'Invalid type. Use: daily, weekly, or monthly' });
      return;
    }

    let aggregateDoc;
    if (type === 'daily') {
      const dateStr = date || new Date().toISOString().split('T')[0];
      aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`daily_${dateStr}`)
        .get();
    } else if (type === 'weekly') {
      const weekStart = date || (() => {
        const monday = new Date();
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        return monday.toISOString().split('T')[0];
      })();
      aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`weekly_${weekStart}`)
        .get();
    } else {
      const month = date || (() => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      })();
      aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`monthly_${month}`)
        .get();
    }

    if (!aggregateDoc.exists) {
      res.status(404).json({ error: 'Aggregate not found' });
      return;
    }

    const aggregate = aggregateDoc.data();
    await exportAggregateToBigQuery(aggregate, type);

    res.json({
      success: true,
      message: `Exported ${type} aggregate to BigQuery`,
      type,
      date: date || 'latest'
    });
  } catch (error: any) {
    console.error('Error in manual BigQuery export:', error);
    res.status(500).json({
      error: 'Failed to export to BigQuery',
      message: error.message
    });
  }
});

