/**
 * Cloud Functions for Mon Valley Pollution Tracking System
 *
 * - processSensorData: Firestore trigger for new sensor readings
 * - submitSymptomReport: HTTPS endpoint for user health reports
 * - scheduledFirestoreBackup: Scheduled Firestore backup (disaster recovery)
 *
 * See master plan for full specs and documentation standards.
 */

import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from 'axios';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * EPA bias correction formula for PurpleAir sensors
 * @param {number} pm25Raw - Raw PM2.5 value
 * @returns {number} Corrected PM2.5 value
 */
function applyEPACorrection(pm25Raw: number): number {
  return 0.52 * pm25Raw - 0.085 * (pm25Raw * pm25Raw) / 1000 + 5.71;
}

/**
 * PurpleAir API configuration
 * @env PURPLEAIR_API_KEY
 */
const PURPLEAIR_CONFIG = {
  baseURL: 'https://api.purpleair.com/v1',
  apiKey: process.env.PURPLEAIR_API_KEY,
  rateLimit: 100, // requests per minute
  endpoints: {
    sensors: '/sensors',
    sensorData: '/sensors/{sensor_index}'
  }
};

/**
 * NASA API configuration
 * @env NASA_API_KEY
 */
const NASA_CONFIG = {
  baseURL: 'https://api.nasa.gov',
  apiKey: process.env.NASA_API_KEY,
  datasets: {
    MODIS: 'modis/terra',
    OMI: 'omi/aura',
    TEMPO: 'tempo/geostationary'
  }
};

/**
 * Placeholder for fetching PurpleAir sensor data
 * @param {string} sensorIndex
 * @returns {Promise<object>} Sensor data (mock)
 */
export async function fetchPurpleAirSensorData(sensorIndex: string): Promise<object> {
  // TODO: Implement real API call using PURPLEAIR_CONFIG
  return { sensorIndex, data: 'mock' };
}

/**
 * Placeholder for fetching NASA satellite data
 * @param {string} dataset
 * @returns {Promise<object>} Satellite data (mock)
 */
export async function fetchNASASatelliteData(dataset: string): Promise<object> {
  // TODO: Implement real API call using NASA_CONFIG
  return { dataset, data: 'mock' };
}

/**
 * Triggered when a new sensor reading is added to Firestore.
 * Applies corrections, checks for alerts, and stores processed data.
 *
 * @firestoreTrigger
 * @collection sensorReadings/{readingId}
 */
export const processSensorData = onDocumentCreated(
  "sensorReadings/{readingId}",
  async (event) => {
    try {
      const reading = event.data?.data();
      if (!reading) throw new Error("No sensor data found");
      logger.info("Processing sensor data", { reading });
      // Apply EPA correction if pm25Raw exists
      let correctedPM25 = null;
      if (typeof reading.pm25Raw === "number") {
        correctedPM25 = applyEPACorrection(reading.pm25Raw);
      }
      // Store processed data in 'processedSensorReadings' collection
      const processedData = {
        ...reading,
        correctedPM25,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("processedSensorReadings").add(processedData);
      // TODO: Check alert thresholds and trigger notifications if needed
      logger.info("Processed sensor data saved", { processedData });
      return { success: true };
    } catch (error) {
      logger.error("Error processing sensor data", { error });
      throw new HttpsError("internal", "Processing failed");
    }
  }
);

/**
 * HTTPS endpoint to submit a user symptom report (OSAC framework).
 *
 * @api {post} /api/symptom-report Submit Symptom Report
 * @apiName SubmitSymptomReport
 * @apiGroup Health
 *
 * @param {String} userId
 * @param {Array} symptoms
 * @param {Number} severity
 * @param {Object} osac
 * @returns {Object} { reportId, message }
 */
export const submitSymptomReport = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send({ error: "Method not allowed" });
      return;
    }
    const { userId, symptoms, severity, osac } = req.body;
    if (!userId || !Array.isArray(symptoms) || !severity || !osac) {
      res.status(400).send({ error: "Missing required fields" });
      return;
    }
    // Save report to Firestore (symptomReports collection)
    const report = {
      userId,
      symptoms,
      severity,
      osac,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const reportRef = await db.collection("symptomReports").add(report);
    logger.info("Symptom report received", { userId, symptoms, severity, osac });
    res.status(200).send({ reportId: reportRef.id, message: "Report submitted" });
  } catch (error) {
    logger.error("Error submitting symptom report", { error });
    res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * HTTPS endpoint to proxy chat requests to local Ollama Llama 3 server.
 * @api {post} /api/llama3-chat
 * @apiName Llama3Chat
 * @apiGroup AI
 *
 * @param {String} message - User's chat message
 * @returns {Object} { response }
 */
export const llama3Chat = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).send({ error: 'Missing or invalid message' });
      return;
    }
    // Proxy to local Ollama server
    const ollamaRes = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: message,
      stream: false
    });
    const response = ollamaRes.data.response || ollamaRes.data;
    res.status(200).send({ response });
  } catch (error) {
    logger.error('Error proxying to Llama 3', { error });
    res.status(500).send({ error: 'Failed to get response from Llama 3' });
  }
});

/**
 * Scheduled Firestore backup (runs every 24 hours).
 * Backs up all collections to a specified GCS bucket.
 *
 * @schedule every 24 hours
 * @env BACKUP_BUCKET (Google Cloud Storage bucket name)
 */
export const scheduledFirestoreBackup = onSchedule({ schedule: 'every 24 hours' }, async (event) => {
  try {
    // @ts-ignore: firestore.v1 is not typed in admin SDK
    const client = new (admin.firestore as any).v1.FirestoreAdminClient();
    const databaseName = client.databasePath(process.env.GCLOUD_PROJECT, '(default)');
    const bucket = process.env.BACKUP_BUCKET;
    if (!bucket) throw new Error('BACKUP_BUCKET env variable not set');
    await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: `gs://${bucket}`,
      collectionIds: [], // All collections
    });
    logger.info('Firestore backup completed', { bucket });
    // Return void for linter compliance
    return;
  } catch (error) {
    logger.error('Error during Firestore backup', { error });
    throw new HttpsError('internal', 'Backup failed');
  }
});
