/**
 * VCAN Data Access API
 * 
 * Provides HIPAA-compliant access to aggregated health data for VCAN
 * No PHI exposed - only aggregated data
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';
import { logAggregateDataAccess, logExportEvent } from './auditLogging';

/**
 * Get Health Aggregates API
 * Returns aggregated health data (no PHI)
 */
export const getHealthAggregates = functions.https.onRequest(async (req, res) => {
  try {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    // Authentication check (optional - can be public for aggregated data)
    const authHeader = req.headers.authorization;
    const userId = authHeader ? 'authenticated-user' : 'anonymous';
    const userRole = authHeader ? 'analyst' : 'public';

    // Get query parameters
    const {
      type = 'daily', // daily, weekly, monthly
      startDate,
      endDate,
      zipCode,
      limit = 100
    } = req.query;

    // Validate type
    if (!['daily', 'weekly', 'monthly'].includes(type as string)) {
      res.status(400).json({ error: 'Invalid type. Use: daily, weekly, or monthly' });
      return;
    }

    // Build query
    let query: admin.firestore.Query = admin.firestore()
      .collection('symptomReportAggregates');

    // Filter by date range if provided
    if (startDate) {
      query = query.where('date', '>=', startDate as string);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate as string);
    }

    // Filter by aggregate type
    const docPrefix = `${type}_`;
    const snapshot = await query.get();
    
    // Filter by prefix and limit
    const aggregates = snapshot.docs
      .filter(doc => doc.id.startsWith(docPrefix))
      .slice(0, parseInt(limit as string))
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    // Filter by zip code if provided
    let filteredAggregates = aggregates;
    if (zipCode) {
      filteredAggregates = aggregates.map((agg: any) => {
        if (agg.geographic && agg.geographic[zipCode as string]) {
          return {
            ...agg,
            geographic: { [zipCode as string]: agg.geographic[zipCode as string] }
          };
        }
        return null;
      }).filter((agg: any) => agg !== null);
    }

    // Log access
    await logAggregateDataAccess(
      userId,
      userRole as 'admin' | 'analyst' | 'system' | 'api',
      'read',
      type as 'daily' | 'weekly' | 'monthly',
      startDate as string || 'all',
      'analytics',
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        filters: { type, startDate, endDate, zipCode, limit }
      }
    );

    res.json({
      success: true,
      count: filteredAggregates.length,
      type,
      aggregates: filteredAggregates,
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: { type, startDate, endDate, zipCode, limit }
      }
    });
  } catch (error: any) {
    console.error('Error fetching health aggregates:', error);
    res.status(500).json({
      error: 'Failed to fetch health aggregates',
      message: error.message
    });
  }
});

/**
 * Export Health Data API
 * Exports aggregated data as CSV or JSON (admin only)
 */
export const exportHealthData = functions.https.onRequest(async (req, res) => {
  try {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    // Admin authentication required
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized. Admin access required.' });
      return;
    }

    // Get query parameters
    const {
      format = 'json', // json or csv
      type = 'daily',
      startDate,
      endDate,
      zipCode
    } = req.query;

    // Validate format
    if (!['json', 'csv'].includes(format as string)) {
      res.status(400).json({ error: 'Invalid format. Use: json or csv' });
      return;
    }

    // Get aggregates (same logic as getHealthAggregates)
    let query: admin.firestore.Query = admin.firestore()
      .collection('symptomReportAggregates');

    if (startDate) {
      query = query.where('date', '>=', startDate as string);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate as string);
    }

    const snapshot = await query.get();
    const docPrefix = `${type}_`;
    const aggregates = snapshot.docs
      .filter(doc => doc.id.startsWith(docPrefix))
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    // Filter by zip code if provided
    let filteredAggregates = aggregates;
    if (zipCode) {
      filteredAggregates = aggregates.map((agg: any) => {
        if (agg.geographic && agg.geographic[zipCode as string]) {
          return {
            ...agg,
            geographic: { [zipCode as string]: agg.geographic[zipCode as string] }
          };
        }
        return null;
      }).filter((agg: any) => agg !== null);
    }

    // Log export
    await logExportEvent(
      'admin',
      'admin',
      'symptomReportAggregates',
      format as 'csv' | 'json',
      filteredAggregates.length,
      'reporting',
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    // Format response
    if (format === 'csv') {
      // Convert to CSV
      if (filteredAggregates.length === 0) {
        res.status(404).json({ error: 'No data found' });
        return;
      }

      const headers = Object.keys(filteredAggregates[0] as any);
      const csvRows = [
        headers.join(','),
        ...filteredAggregates.map((agg: any) =>
          headers.map(header => {
            const value = agg[header];
            if (typeof value === 'object') {
              return JSON.stringify(value).replace(/"/g, '""');
            }
            return `"${value}"`;
          }).join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="health-aggregates-${type}-${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      // JSON format
      res.json({
        success: true,
        count: filteredAggregates.length,
        format: 'json',
        type,
        data: filteredAggregates,
        metadata: {
          exportedAt: new Date().toISOString(),
          filters: { type, startDate, endDate, zipCode }
        }
      });
    }
  } catch (error: any) {
    console.error('Error exporting health data:', error);
    res.status(500).json({
      error: 'Failed to export health data',
      message: error.message
    });
  }
});

/**
 * Get Health Metrics (KPIs for dashboard)
 * Returns key performance indicators
 */
export const getHealthMetrics = functions.https.onRequest(async (req, res) => {
  try {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    // Get date range (default: last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get daily aggregates for the period
    const aggregatesSnapshot = await admin.firestore()
      .collection('symptomReportAggregates')
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .get();

    const aggregates = aggregatesSnapshot.docs
      .filter(doc => doc.id.startsWith('daily_'))
      .map(doc => doc.data());

    // Calculate KPIs
    const totalReports = aggregates.reduce((sum: number, agg: any) => sum + (agg.totalReports || 0), 0);
    const avgDailyReports = aggregates.length > 0 ? totalReports / aggregates.length : 0;
    
    // Aggregate symptoms
    const symptomCounts: { [key: string]: number } = {};
    aggregates.forEach((agg: any) => {
      if (agg.symptoms) {
        Object.entries(agg.symptoms).forEach(([symptom, count]: [string, any]) => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + (count || 0);
        });
      }
    });

    // Aggregate severity
    const severityCounts = {
      mild: 0,
      moderate: 0,
      severe: 0,
      very_severe: 0,
      extreme: 0
    };
    aggregates.forEach((agg: any) => {
      if (agg.severity) {
        Object.entries(agg.severity).forEach(([level, count]: [string, any]) => {
          if (level in severityCounts) {
            severityCounts[level as keyof typeof severityCounts] += count || 0;
          }
        });
      }
    });

    // Calculate average correlation
    const correlations = aggregates
      .map((agg: any) => agg.correlationScore)
      .filter((score: any) => score !== null && !isNaN(score));
    const avgCorrelation = correlations.length > 0
      ? correlations.reduce((sum: number, score: number) => sum + score, 0) / correlations.length
      : null;

    const metrics = {
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: 30
      },
      totals: {
        reports: totalReports,
        avgDailyReports: Math.round(avgDailyReports * 10) / 10,
        daysWithData: aggregates.length
      },
      symptoms: symptomCounts,
      severity: severityCounts,
      correlation: {
        average: avgCorrelation ? Math.round(avgCorrelation * 100) / 100 : null,
        interpretation: avgCorrelation ? (
          avgCorrelation > 0.7 ? 'Strong correlation' :
          avgCorrelation > 0.5 ? 'Moderate correlation' :
          avgCorrelation > 0.3 ? 'Weak correlation' : 'No significant correlation'
        ) : 'Insufficient data'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        source: 'health_metrics_api'
      }
    };

    // Log access
    await logAggregateDataAccess(
      'api-user',
      'analyst',
      'read',
      'daily',
      'metrics',
      'analytics',
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      success: true,
      metrics
    });
  } catch (error: any) {
    console.error('Error fetching health metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch health metrics',
      message: error.message
    });
  }
});

