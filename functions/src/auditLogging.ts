/**
 * Comprehensive Audit Logging System
 * 
 * HIPAA Requirement: Log all access to Protected Health Information (PHI)
 * Tracks: Who accessed what, when, why, and from where
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';

export interface AuditLog {
  timestamp: string; // ISO 8601
  userId: string; // Pseudonymized user ID
  userRole: 'admin' | 'analyst' | 'system' | 'api';
  action: 'read' | 'write' | 'export' | 'delete' | 'query' | 'aggregate';
  resource: 'symptomReports' | 'healthAlerts' | 'symptomReportAggregates' | 'titleVFacilities' | 'auditLogs';
  resourceId?: string; // Document/record ID
  purpose: 'analytics' | 'reporting' | 'compliance' | 'maintenance' | 'user_request' | 'automated';
  ipAddress: string; // Hashed for privacy
  userAgent: string; // Hashed for privacy
  details?: {
    query?: any; // Query parameters
    filters?: any; // Applied filters
    exportFormat?: 'csv' | 'json' | 'pdf';
    recordCount?: number; // Number of records accessed
    correlationId?: string; // For tracking related actions
    destination?: string; // Export destination (bigquery, synapse, data_lake)
    agency?: string; // For regulatory reports
    period?: string; // For quarterly reports
    reportType?: string; // Type of report
    [key: string]: any; // Allow additional fields
  };
  compliance: {
    hipaaCompliant: boolean;
    dataType: 'phi' | 'aggregated' | 'public';
    retentionPeriod: number; // Days
  };
  metadata: {
    source: 'cloud_function' | 'api' | 'dashboard' | 'scheduled_job';
    version: '1.0';
  };
}

/**
 * Hash sensitive data for privacy
 */
function hashSensitiveData(data: string): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(data + (process.env.AUDIT_SALT || 'audit-salt'))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  userId: string,
  userRole: AuditLog['userRole'],
  action: AuditLog['action'],
  resource: AuditLog['resource'],
  purpose: AuditLog['purpose'],
  options?: {
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: AuditLog['details'];
    source?: AuditLog['metadata']['source'];
  }
): Promise<void> {
  try {
    const auditLog: AuditLog = {
      timestamp: new Date().toISOString(),
      userId: hashSensitiveData(userId), // Pseudonymize
      userRole,
      action,
      resource,
      resourceId: options?.resourceId,
      purpose,
      ipAddress: options?.ipAddress ? hashSensitiveData(options.ipAddress) : 'unknown',
      userAgent: options?.userAgent ? hashSensitiveData(options.userAgent) : 'unknown',
      details: options?.details,
      compliance: {
        hipaaCompliant: resource === 'symptomReports' || resource === 'healthAlerts',
        dataType: resource === 'symptomReports' || resource === 'healthAlerts' ? 'phi' :
                  resource === 'symptomReportAggregates' ? 'aggregated' : 'public',
        retentionPeriod: resource === 'symptomReports' || resource === 'healthAlerts' ? 3650 : // 10 years
                         resource === 'symptomReportAggregates' ? 2555 : // 7 years
                         365 // 1 year for public data
      },
      metadata: {
        source: options?.source || 'cloud_function',
        version: '1.0'
      }
    };

    // Store in Firestore
    await admin.firestore()
      .collection('auditLogs')
      .add(auditLog);

    console.log(`Audit log created: ${action} on ${resource} by ${userRole}`);
  } catch (error: any) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging failure shouldn't break main functionality
  }
}

/**
 * Log health data access (HIPAA requirement)
 */
export async function logHealthDataAccess(
  userId: string,
  userRole: AuditLog['userRole'],
  action: 'read' | 'export',
  resourceId: string | undefined,
  purpose: AuditLog['purpose'],
  options?: {
    ipAddress?: string;
    userAgent?: string;
    recordCount?: number;
    exportFormat?: 'csv' | 'json' | 'pdf';
  }
): Promise<void> {
  await logAuditEvent(
    userId,
    userRole,
    action,
    'symptomReports',
    purpose,
    {
      resourceId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      details: {
        recordCount: options?.recordCount,
        exportFormat: options?.exportFormat
      },
      source: 'api'
    }
  );
}

/**
 * Log aggregated data access (non-PHI)
 */
export async function logAggregateDataAccess(
  userId: string,
  userRole: AuditLog['userRole'],
  action: 'read' | 'export',
  aggregateType: 'daily' | 'weekly' | 'monthly',
  date: string,
  purpose: AuditLog['purpose'],
  options?: {
    ipAddress?: string;
    userAgent?: string;
    filters?: any;
  }
): Promise<void> {
  await logAuditEvent(
    userId,
    userRole,
    action,
    'symptomReportAggregates',
    purpose,
    {
      resourceId: `${aggregateType}_${date}`,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      details: {
        query: { type: aggregateType, date },
        filters: options?.filters
      },
      source: 'dashboard'
    }
  );
}

/**
 * Log export event (HIPAA requirement)
 */
export async function logExportEvent(
  userId: string,
  userRole: AuditLog['userRole'],
  resource: AuditLog['resource'],
  exportFormat: 'csv' | 'json' | 'pdf',
  recordCount: number,
  purpose: AuditLog['purpose'],
  options?: {
    ipAddress?: string;
    userAgent?: string;
    resourceId?: string;
  }
): Promise<void> {
  await logAuditEvent(
    userId,
    userRole,
    'export',
    resource,
    purpose,
    {
      resourceId: options?.resourceId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      details: {
        exportFormat,
        recordCount
      },
      source: 'api'
    }
  );
}

/**
 * Get audit logs (admin only)
 */
export async function getAuditLogs(
  filters?: {
    userId?: string;
    resource?: AuditLog['resource'];
    action?: AuditLog['action'];
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AuditLog[]> {
  let query: admin.firestore.Query = admin.firestore().collection('auditLogs');

  if (filters?.userId) {
    query = query.where('userId', '==', hashSensitiveData(filters.userId));
  }
  if (filters?.resource) {
    query = query.where('resource', '==', filters.resource);
  }
  if (filters?.action) {
    query = query.where('action', '==', filters.action);
  }
  if (filters?.startDate) {
    query = query.where('timestamp', '>=', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.where('timestamp', '<=', filters.endDate);
  }

  query = query.orderBy('timestamp', 'desc');
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(1000); // Default limit
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as AuditLog);
}

/**
 * Cloud Function: Get audit logs (admin only)
 */
export const getAuditLogsAPI = functions.https.onRequest(async (req, res) => {
  try {
    // Check admin authentication
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filters = req.query as any;
    const logs = await getAuditLogs(filters);

    // Log this access
    await logAuditEvent(
      'admin',
      'admin',
      'read',
      'auditLogs',
      'compliance',
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { recordCount: logs.length }
      }
    );

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * Cloud Function: Cleanup old audit logs (retention policy)
 */
export const cleanupAuditLogs = functions.pubsub.schedule('0 3 * * 0')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const now = new Date();
      
      // Delete logs older than retention period
      // PHI logs: 10 years, Aggregated: 7 years, Public: 1 year
      const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
      const sevenYearsAgo = new Date(now.getFullYear() - 7, now.getMonth(), now.getDate());
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      // Delete PHI logs older than 10 years
      const phiLogsSnapshot = await admin.firestore()
        .collection('auditLogs')
        .where('compliance.dataType', '==', 'phi')
        .where('timestamp', '<', tenYearsAgo.toISOString())
        .limit(500)
        .get();

      const phiBatch = admin.firestore().batch();
      phiLogsSnapshot.docs.forEach(doc => {
        phiBatch.delete(doc.ref);
      });
      await phiBatch.commit();

      // Delete aggregated logs older than 7 years
      const aggLogsSnapshot = await admin.firestore()
        .collection('auditLogs')
        .where('compliance.dataType', '==', 'aggregated')
        .where('timestamp', '<', sevenYearsAgo.toISOString())
        .limit(500)
        .get();

      const aggBatch = admin.firestore().batch();
      aggLogsSnapshot.docs.forEach(doc => {
        aggBatch.delete(doc.ref);
      });
      await aggBatch.commit();

      // Delete public logs older than 1 year
      const publicLogsSnapshot = await admin.firestore()
        .collection('auditLogs')
        .where('compliance.dataType', '==', 'public')
        .where('timestamp', '<', oneYearAgo.toISOString())
        .limit(500)
        .get();

      const publicBatch = admin.firestore().batch();
      publicLogsSnapshot.docs.forEach(doc => {
        publicBatch.delete(doc.ref);
      });
      await publicBatch.commit();

      const totalDeleted = phiLogsSnapshot.size + aggLogsSnapshot.size + publicLogsSnapshot.size;
      console.log(`✅ Cleaned up ${totalDeleted} old audit logs`);

      return null;
    } catch (error: any) {
      console.error('Error cleaning up audit logs:', error);
      throw error;
    }
  });

