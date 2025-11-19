/**
 * Azure Synapse Analytics Export Function
 * 
 * Exports aggregated health data to Azure Synapse for analytics
 * HIPAA-Compliant: Only aggregated data (no PHI)
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';
import { logAuditEvent } from './auditLogging';

// Azure Synapse connection (would use Azure SDK in production)
// For now, this is a template that shows the structure

interface SynapseConfig {
  workspaceName: string;
  databaseName: string;
  tableName: string;
  connectionString: string;
}

/**
 * Get Synapse configuration from environment
 */
function getSynapseConfig(): SynapseConfig | null {
  const connectionString = process.env.AZURE_SYNAPSE_CONNECTION_STRING;
  if (!connectionString) {
    console.warn('Azure Synapse connection string not configured');
    return null;
  }

  return {
    workspaceName: process.env.AZURE_SYNAPSE_WORKSPACE || 'mv-pollution-synapse',
    databaseName: process.env.AZURE_SYNAPSE_DATABASE || 'health_data_warehouse',
    tableName: process.env.AZURE_SYNAPSE_TABLE || 'symptom_report_aggregates',
    connectionString,
  };
}

/**
 * Export aggregate to Azure Synapse
 * Note: In production, use @azure/synapse-spark or REST API
 */
async function exportAggregateToSynapse(
  aggregate: any,
  aggregateType: 'daily' | 'weekly' | 'monthly'
): Promise<void> {
  const config = getSynapseConfig();
  if (!config) {
    throw new Error('Azure Synapse not configured');
  }

  try {
    // In production, use Azure SDK:
    // const { SynapseManagementClient } = require('@azure/arm-synapse');
    // const client = new SynapseManagementClient(credentials, subscriptionId);
    
    // For now, log the structure (would be replaced with actual API call)
    const row = {
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
      week_start: aggregate.weekStart || null,
      week_end: aggregate.weekEnd || null,
      month: aggregate.month || null,
      report_growth: aggregate.trends?.reportGrowth || null,
      symptom_trends: JSON.stringify(aggregate.trends?.symptomTrends || {}),
      generated_at: new Date().toISOString(),
    };

    // TODO: Replace with actual Synapse API call
    // await synapseClient.insertRow(config.databaseName, config.tableName, row);
    
    console.log(`✅ Exported ${aggregateType} aggregate to Synapse: ${row.date}`);
    console.log('Note: Actual Synapse export requires Azure SDK setup');
  } catch (error: any) {
    console.error('Error exporting to Synapse:', error);
    throw error;
  }
}

/**
 * Cloud Function: Export daily aggregates to Synapse
 */
export const exportDailyAggregatesToSynapse = functions.pubsub.schedule('0 1 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const aggregateDoc = await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`daily_${dateStr}`)
        .get();

      if (!aggregateDoc.exists) {
        console.warn(`Daily aggregate not found for ${dateStr}`);
        return null;
      }

      const aggregate = aggregateDoc.data();
      await exportAggregateToSynapse(aggregate, 'daily');

      await logAuditEvent(
        'system',
        'system',
        'export',
        'symptomReportAggregates',
        'analytics',
        {
          resourceId: `daily_${dateStr}`,
          details: { exportFormat: 'json' as const, recordCount: 1, destination: 'synapse' },
          source: 'scheduled_job'
        }
      );

      return null;
    } catch (error: any) {
      console.error('Error exporting to Synapse:', error);
      throw error;
    }
  });

/**
 * Manual export trigger
 */
export const exportToSynapseManual = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { type, date } = req.body;

    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }

    // Get aggregate (same logic as BigQuery)
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
    await exportAggregateToSynapse(aggregate, type);

    res.json({
      success: true,
      message: `Exported ${type} aggregate to Synapse`,
      type,
      date: date || 'latest'
    });
  } catch (error: any) {
    console.error('Error in manual Synapse export:', error);
    res.status(500).json({
      error: 'Failed to export to Synapse',
      message: error.message
    });
  }
});

