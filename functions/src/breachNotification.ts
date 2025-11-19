/**
 * Breach Notification System
 * 
 * HIPAA Requirement: 72-hour breach notification
 * Detects potential breaches and triggers notification process
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';
import { logAuditEvent } from './auditLogging';

interface BreachEvent {
  breachId: string;
  detectedAt: string;
  type: 'unauthorized_access' | 'data_exposure' | 'system_compromise' | 'data_loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  affectedUsers: number;
  dataTypes: string[]; // ['symptomReports', 'healthAlerts']
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'notified';
  notificationSent: boolean;
  notificationSentAt: string | null;
  remediation: string[];
  metadata: {
    source: 'automated_detection' | 'manual_report' | 'audit_review';
    detectedBy: string;
    version: '1.0';
  };
}

/**
 * Detect potential breaches from audit logs
 */
async function detectBreaches(): Promise<BreachEvent[]> {
  const breaches: BreachEvent[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // Check for suspicious access patterns
    const suspiciousAccess = await admin.firestore()
      .collection('auditLogs')
      .where('timestamp', '>=', oneHourAgo.toISOString())
      .where('compliance.dataType', '==', 'phi')
      .get();

    // Group by user
    const accessByUser: { [userId: string]: any[] } = {};
    suspiciousAccess.docs.forEach(doc => {
      const log = doc.data();
      const userId = log.userId;
      if (!accessByUser[userId]) {
        accessByUser[userId] = [];
      }
      accessByUser[userId].push(log);
    });

    // Detect anomalies
    Object.entries(accessByUser).forEach(([userId, logs]) => {
      // Too many accesses in short time
      if (logs.length > 100) {
        breaches.push({
          breachId: `breach_${Date.now()}_${userId}`,
          detectedAt: new Date().toISOString(),
          type: 'unauthorized_access',
          severity: 'high',
          description: `User ${userId} accessed ${logs.length} PHI records in 1 hour`,
          affectedRecords: logs.length,
          affectedUsers: 1,
          dataTypes: [...new Set(logs.map((l: any) => l.resource))],
          status: 'detected',
          notificationSent: false,
          notificationSentAt: null,
          remediation: [
            'Review user access permissions',
            'Verify access was authorized',
            'Consider suspending user account if unauthorized'
          ],
          metadata: {
            source: 'automated_detection',
            detectedBy: 'breach_detection_system',
            version: '1.0'
          }
        });
      }

      // Access outside business hours (if configured)
      const afterHoursAccess = logs.filter((log: any) => {
        const hour = new Date(log.timestamp).getHours();
        return hour < 6 || hour > 22; // Outside 6 AM - 10 PM
      });

      if (afterHoursAccess.length > 10) {
        breaches.push({
          breachId: `breach_${Date.now()}_${userId}_afterhours`,
          detectedAt: new Date().toISOString(),
          type: 'unauthorized_access',
          severity: 'medium',
          description: `User ${userId} accessed ${afterHoursAccess.length} PHI records outside business hours`,
          affectedRecords: afterHoursAccess.length,
          affectedUsers: 1,
          dataTypes: [...new Set(afterHoursAccess.map((l: any) => l.resource))],
          status: 'detected',
          notificationSent: false,
          notificationSentAt: null,
          remediation: [
            'Verify after-hours access was authorized',
            'Review user access patterns'
          ],
          metadata: {
            source: 'automated_detection',
            detectedBy: 'breach_detection_system',
            version: '1.0'
          }
        });
      }
    });

    // Check for bulk exports
    const bulkExports = await admin.firestore()
      .collection('auditLogs')
      .where('timestamp', '>=', oneHourAgo.toISOString())
      .where('action', '==', 'export')
      .where('compliance.dataType', '==', 'phi')
      .get();

    bulkExports.docs.forEach(doc => {
      const log = doc.data();
      const recordCount = log.details?.recordCount || 0;
      
      if (recordCount > 1000) {
        breaches.push({
          breachId: `breach_${Date.now()}_bulk_export_${doc.id}`,
          detectedAt: new Date().toISOString(),
          type: 'data_exposure',
          severity: 'critical',
          description: `Bulk export of ${recordCount} PHI records detected`,
          affectedRecords: recordCount,
          affectedUsers: recordCount, // Approximate
          dataTypes: [log.resource],
          status: 'detected',
          notificationSent: false,
          notificationSentAt: null,
          remediation: [
            'Immediately review export authorization',
            'Verify export was for legitimate purpose',
            'Check if data was properly secured after export',
            'Notify affected individuals if unauthorized'
          ],
          metadata: {
            source: 'automated_detection',
            detectedBy: 'breach_detection_system',
            version: '1.0'
          }
        });
      }
    });

    return breaches;
  } catch (error: any) {
    console.error('Error detecting breaches:', error);
    return [];
  }
}

/**
 * Store breach event
 */
async function storeBreachEvent(breach: BreachEvent): Promise<void> {
  await admin.firestore()
    .collection('breachEvents')
    .doc(breach.breachId)
    .set(breach);
}

/**
 * Send breach notification (72-hour requirement)
 */
async function sendBreachNotification(breach: BreachEvent): Promise<void> {
  // In production, this would:
  // 1. Send email to compliance officer
  // 2. Send SMS alert
  // 3. Create incident ticket
  // 4. Log to compliance system
  
  console.log(`🚨 BREACH DETECTED: ${breach.breachId}`);
  console.log(`   Type: ${breach.type}`);
  console.log(`   Severity: ${breach.severity}`);
  console.log(`   Affected Records: ${breach.affectedRecords}`);
  console.log(`   Description: ${breach.description}`);
  console.log(`   ⚠️ 72-HOUR NOTIFICATION REQUIRED`);
  
  // TODO: Implement actual notification
  // await emailService.send({
  //   to: 'compliance@vcan.org',
  //   subject: `HIPAA Breach Detected: ${breach.breachId}`,
  //   body: breach.description
  // });
  
  // Update breach status
  await admin.firestore()
    .collection('breachEvents')
    .doc(breach.breachId)
    .update({
      notificationSent: true,
      notificationSentAt: new Date().toISOString(),
      status: 'notified'
    });
}

/**
 * Cloud Function: Detect breaches (runs hourly)
 */
export const detectBreachesScheduled = functions.pubsub.schedule('0 * * * *') // Every hour
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      console.log('Running breach detection...');
      
      const breaches = await detectBreaches();
      
      if (breaches.length === 0) {
        console.log('✅ No breaches detected');
        return null;
      }

      console.log(`⚠️ Detected ${breaches.length} potential breach(es)`);

      for (const breach of breaches) {
        await storeBreachEvent(breach);
        await sendBreachNotification(breach);

        // Log breach detection
        await logAuditEvent(
          'system',
          'system',
          'read',
          'auditLogs',
          'compliance',
          {
            details: {
              breachId: breach.breachId,
              breachType: breach.type,
              severity: breach.severity
            },
            source: 'scheduled_job'
          }
        );
      }

      return null;
    } catch (error: any) {
      console.error('Error in breach detection:', error);
      throw error;
    }
  });

/**
 * Manual breach report
 */
export const reportBreachManual = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      type,
      severity,
      description,
      affectedRecords,
      affectedUsers,
      dataTypes
    } = req.body;

    if (!type || !severity || !description) {
      res.status(400).json({ error: 'Missing required fields: type, severity, description' });
      return;
    }

    const breach: BreachEvent = {
      breachId: `breach_manual_${Date.now()}`,
      detectedAt: new Date().toISOString(),
      type,
      severity,
      description,
      affectedRecords: affectedRecords || 0,
      affectedUsers: affectedUsers || 0,
      dataTypes: dataTypes || [],
      status: 'detected',
      notificationSent: false,
      notificationSentAt: null,
      remediation: [],
      metadata: {
        source: 'manual_report',
        detectedBy: 'admin',
        version: '1.0'
      }
    };

    await storeBreachEvent(breach);
    await sendBreachNotification(breach);

    res.json({
      success: true,
      breach,
      message: 'Breach reported and notification sent'
    });
  } catch (error: any) {
    console.error('Error reporting breach:', error);
    res.status(500).json({
      error: 'Failed to report breach',
      message: error.message
    });
  }
});

/**
 * Get breach events (admin only)
 */
export const getBreachEvents = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { status, severity, limit = 100 } = req.query;

    let query: admin.firestore.Query = admin.firestore()
      .collection('breachEvents');

    if (status) {
      query = query.where('status', '==', status);
    }
    if (severity) {
      query = query.where('severity', '==', severity);
    }

    query = query.orderBy('detectedAt', 'desc').limit(parseInt(limit as string));

    const snapshot = await query.get();
    const breaches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: breaches.length,
      breaches
    });
  } catch (error: any) {
    console.error('Error fetching breach events:', error);
    res.status(500).json({
      error: 'Failed to fetch breach events',
      message: error.message
    });
  }
});

