/**
 * Data Integrity Verification
 * 
 * HIPAA Requirement: Data Integrity - Tamper-proof storage
 * Verifies data hasn't been tampered with using checksums
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';
import { logAuditEvent } from './auditLogging';

const crypto = require('crypto');

/**
 * Generate checksum for data
 */
function generateChecksum(data: any): string {
  const dataString = JSON.stringify(data);
  return crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
}

/**
 * Verify data integrity
 */
async function verifyDataIntegrity(
  collectionName: string,
  documentId: string
): Promise<{ valid: boolean; checksum: string; storedChecksum?: string }> {
  try {
    const doc = await admin.firestore()
      .collection(collectionName)
      .doc(documentId)
      .get();

    if (!doc.exists) {
      return { valid: false, checksum: '' };
    }

    const data = doc.data();
    if (!data) {
      return { valid: false, checksum: '' };
    }

    // Extract checksum if stored
    const storedChecksum = data._integrityChecksum;
    const dataWithoutChecksum = { ...data };
    delete dataWithoutChecksum._integrityChecksum;
    delete dataWithoutChecksum._integrityVerifiedAt;

    // Generate current checksum
    const currentChecksum = generateChecksum(dataWithoutChecksum);

    // Verify
    const valid = !storedChecksum || storedChecksum === currentChecksum;

    return {
      valid,
      checksum: currentChecksum,
      storedChecksum
    };
  } catch (error: any) {
    console.error('Error verifying data integrity:', error);
    return { valid: false, checksum: '' };
  }
}

/**
 * Add integrity checksum to document
 */
export async function addIntegrityChecksum(
  collectionName: string,
  documentId: string
): Promise<void> {
  try {
    const doc = await admin.firestore()
      .collection(collectionName)
      .doc(documentId)
      .get();

    if (!doc.exists) {
      throw new Error('Document not found');
    }

    const data = doc.data();
    if (!data) {
      throw new Error('Document data is empty');
    }

    // Remove existing checksum
    const dataWithoutChecksum = { ...data };
    delete dataWithoutChecksum._integrityChecksum;
    delete dataWithoutChecksum._integrityVerifiedAt;

    // Generate checksum
    const checksum = generateChecksum(dataWithoutChecksum);

    // Update document with checksum
    await admin.firestore()
      .collection(collectionName)
      .doc(documentId)
      .update({
        _integrityChecksum: checksum,
        _integrityVerifiedAt: new Date().toISOString()
      });

    console.log(`✅ Added integrity checksum to ${collectionName}/${documentId}`);
  } catch (error: any) {
    console.error('Error adding integrity checksum:', error);
    throw error;
  }
}

/**
 * Verify all health data integrity (scheduled)
 */
export const verifyHealthDataIntegrity = functions.pubsub.schedule('0 2 * * *') // Daily at 2 AM
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      console.log('Verifying health data integrity...');

      // Get recent symptom reports (last 100)
      const reportsSnapshot = await admin.firestore()
        .collection('symptomReports')
        .orderBy('submittedAt', 'desc')
        .limit(100)
        .get();

      let validCount = 0;
      let invalidCount = 0;
      const invalidDocs: string[] = [];

      for (const doc of reportsSnapshot.docs) {
        const verification = await verifyDataIntegrity('symptomReports', doc.id);
        
        if (verification.valid) {
          validCount++;
          // Add checksum if missing
          if (!verification.storedChecksum) {
            await addIntegrityChecksum('symptomReports', doc.id);
          }
        } else {
          invalidCount++;
          invalidDocs.push(doc.id);
          
          // Log integrity violation
          await logAuditEvent(
            'system',
            'system',
            'read',
            'symptomReports',
            'compliance',
            {
              resourceId: doc.id,
              details: {
                integrityCheck: 'failed',
                storedChecksum: verification.storedChecksum,
                currentChecksum: verification.checksum
              },
              source: 'scheduled_job'
            }
          );
        }
      }

      console.log(`✅ Integrity check complete: ${validCount} valid, ${invalidCount} invalid`);

      if (invalidCount > 0) {
        console.error(`⚠️ ${invalidCount} documents failed integrity check:`, invalidDocs);
        // In production, send alert
      }

      return null;
    } catch (error: any) {
      console.error('Error verifying data integrity:', error);
      throw error;
    }
  });

/**
 * Manual integrity check
 */
export const verifyDataIntegrityManual = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { collection, documentId } = req.query;

    if (!collection || !documentId) {
      res.status(400).json({ error: 'collection and documentId required' });
      return;
    }

    const verification = await verifyDataIntegrity(collection as string, documentId as string);

    res.json({
      success: true,
      valid: verification.valid,
      checksum: verification.checksum,
      storedChecksum: verification.storedChecksum,
      message: verification.valid ? 'Data integrity verified' : 'Data integrity check failed'
    });
  } catch (error: any) {
    console.error('Error in manual integrity check:', error);
    res.status(500).json({
      error: 'Failed to verify data integrity',
      message: error.message
    });
  }
});

/**
 * Add checksum to existing document
 */
export const addChecksumManual = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { collection, documentId } = req.body;

    if (!collection || !documentId) {
      res.status(400).json({ error: 'collection and documentId required' });
      return;
    }

    await addIntegrityChecksum(collection, documentId);

    res.json({
      success: true,
      message: 'Integrity checksum added'
    });
  } catch (error: any) {
    console.error('Error adding checksum:', error);
    res.status(500).json({
      error: 'Failed to add checksum',
      message: error.message
    });
  }
});

