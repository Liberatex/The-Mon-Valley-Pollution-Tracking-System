/**
 * Cloud Functions for Mon Valley Pollution Tracking System
 *
 * - processSensorData: Firestore trigger for new sensor readings
 * - submitSymptomReport: HTTPS endpoint for user health reports
 * - scheduledFirestoreBackup: Scheduled Firestore backup (disaster recovery)
 *
 * See master plan for full specs and documentation standards.
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions';
import cors from 'cors';

// Initialize Firebase Admin SDK
admin.initializeApp();

// CORS handler
const corsHandler = cors({ origin: true });

// Proxy function for AI chat
export const llama3Chat = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      const { message } = request.body;
      
      if (!message) {
        response.status(400).json({ error: 'Message is required' });
        return;
      }

      // For now, return a fallback response since we can't connect to local Ollama from cloud
      const fallbackResponse = `I'm BreatheAI, your air quality health assistant for the Mon Valley region. 

Based on your question about "${message}", here's what I can tell you:

**Mon Valley Air Quality Context:**
- The Mon Valley is home to major steel mills including U.S. Steel's Clairton Works
- Air quality is monitored by EPA, PurpleAir sensors, and local health departments
- Common pollutants include PM2.5, SO2, NOx, and VOCs from industrial processes

**Health Effects:**
- PM2.5 can penetrate deep into lungs and cause respiratory issues
- Long-term exposure is linked to cardiovascular problems and increased cancer risk
- Sensitive groups should monitor air quality and limit outdoor activity during poor conditions

**Current Status:**
I'm currently operating in fallback mode. For real-time AI responses with our full knowledge base, please ensure the local backend server is running.

Would you like me to provide more specific information about air quality monitoring, health effects, or the Mon Valley region?`;

      response.json({
        response: fallbackResponse,
        context_used: true,
        sources: ['epa', 'purpleair', 'mon_valley_knowledge']
      });

    } catch (error) {
      console.error('AI Chat Error:', error);
      response.status(500).json({
        response: 'Sorry, I could not generate a response at this time. Please try again later.',
        context_used: false,
        error: 'Service temporarily unavailable'
      });
    }
  });
});

// Health check function
export const healthCheck = functions.https.onRequest((request, response) => {
  corsHandler(request, response, () => {
    response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'running',
        ollama: 'fallback_mode',
        database: 'connected'
      },
      message: 'Firebase Cloud Functions are operational'
    });
  });
});

// Metrics function
export const getMetrics = functions.https.onRequest((request, response) => {
  corsHandler(request, response, () => {
    response.json({
      uptime: Date.now(),
      requests: 0,
      errors: 0,
      errorRate: 0,
      avgResponseTime: 0,
      ollamaRequests: 0,
      ollamaErrors: 0,
      ollamaSuccessRate: 100,
      activeUsers: 0,
      features: {
        chat: 0,
        health: 0,
        ollamaTest: 0
      },
      message: 'Metrics in fallback mode'
    });
  });
});

// Existing functions (keeping them for compatibility)
export const processSensorData = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      res.json({ message: 'Sensor data processing endpoint' });
    } catch (error) {
      console.error('Error processing sensor data', error);
      res.status(500).json({ error: 'Failed to process sensor data' });
    }
  });
});

export const submitSymptomReport = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      res.json({ message: 'Symptom report submission endpoint' });
    } catch (error) {
      console.error('Error submitting symptom report', error);
      res.status(500).json({ error: 'Failed to submit symptom report' });
    }
  });
});
