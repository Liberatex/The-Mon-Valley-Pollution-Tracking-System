/**
 * HIPAA Compliance Architecture
 * Separate schemas, encryption, Row-Level Security, health data vault
 */

import * as admin from 'firebase-admin';

/**
 * Health Data Vault - Encrypted storage for PHI
 */
export interface HealthDataVault {
  userId: string; // Pseudonymized
  encryptedData: string; // AES-256 encrypted JSON
  encryptionKeyId: string; // Reference to key in Key Vault
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Encrypt health data before storage
 */
export async function encryptHealthData(
  data: any,
  encryptionKey: string
): Promise<string> {
  // In production, use Firebase Admin SDK encryption or Cloud KMS
  // For now, placeholder - would use crypto.createCipheriv
  
  // Simplified: In production, use:
  // const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  // const encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex');
  
  return Buffer.from(JSON.stringify(data)).toString('base64'); // Placeholder
}

/**
 * Decrypt health data
 */
export async function decryptHealthData(
  encryptedData: string,
  encryptionKey: string
): Promise<any> {
  // In production, use Firebase Admin SDK decryption or Cloud KMS
  const decrypted = Buffer.from(encryptedData, 'base64').toString('utf8');
  return JSON.parse(decrypted);
}

/**
 * Pseudonymize user ID for storage
 */
export function pseudonymizeUserId(userId: string): string {
  // Use SHA-256 hash
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 32);
}

/**
 * Store health data in encrypted vault
 */
export async function storeInHealthVault(
  userId: string,
  healthData: any
): Promise<void> {
  const db = admin.firestore();
  const pseudonymizedId = pseudonymizeUserId(userId);
  
  // Get encryption key (in production, from Cloud KMS or Key Vault)
  const encryptionKey = process.env.HEALTH_DATA_ENCRYPTION_KEY || 'default-key';
  
  // Encrypt data
  const encryptedData = await encryptHealthData(healthData, encryptionKey);
  
  // Store in health_vault collection (protected by Firestore security rules)
  // Use ISO string for emulator compatibility (serverTimestamp() doesn't work well in emulators)
  const now = new Date().toISOString();
  await db.collection('health_vault').doc(pseudonymizedId).set({
    userId: pseudonymizedId,
    encryptedData,
    encryptionKeyId: 'default',
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Retrieve health data from vault
 */
export async function retrieveFromHealthVault(
  userId: string
): Promise<any | null> {
  const db = admin.firestore();
  const pseudonymizedId = pseudonymizeUserId(userId);
  
  const doc = await db.collection('health_vault').doc(pseudonymizedId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  const vaultData = doc.data() as HealthDataVault;
  const encryptionKey = process.env.HEALTH_DATA_ENCRYPTION_KEY || 'default-key';
  
  return await decryptHealthData(vaultData.encryptedData, encryptionKey);
}

/**
 * Audit log entry for HIPAA compliance
 */
export interface AuditLogEntry {
  timestamp: Date;
  userId: string; // Pseudonymized
  action: 'read' | 'write' | 'update' | 'delete';
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

/**
 * Log data access for audit trail
 */
export async function logDataAccess(
  userId: string,
  action: AuditLogEntry['action'],
  resource: string,
  success: boolean,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const db = admin.firestore();
  const pseudonymizedId = pseudonymizeUserId(userId);
  
  const auditEntry: AuditLogEntry = {
    timestamp: new Date(),
    userId: pseudonymizedId,
    action,
    resource,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    success,
  };
  
  // Store in audit_logs collection (immutable, append-only)
  await db.collection('audit_logs').add(auditEntry);
}

/**
 * Firestore Security Rules for HIPAA compliance
 * This would be added to firestore.rules
 */
export const HIPAA_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Health Vault - Only accessible by authenticated users, read-only for their own data
    match /health_vault/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only server-side writes allowed
    }
    
    // Audit Logs - Read-only, append-only
    match /audit_logs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    
    // Public data (sensor readings, facilities) - Read-only for all
    match /sensors/{sensorId} {
      allow read: if true;
      allow write: if false;
    }
    
    match /facilities/{facilityId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
`;

