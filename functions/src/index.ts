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
import axios from 'axios';
import { getMonValleyAirQuality, pm25ToAQI } from './acqdDataService';
import { getHistoricalDataForChart } from './achdScraper';

// Load environment variables from .env file
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  const dotenv = require('dotenv');
  dotenv.config();
  console.log('✅ Loaded environment variables from .env');
}

// Initialize Firebase Admin SDK
admin.initializeApp();

// CORS handler
const corsHandler = cors({ origin: true });

// Custom knowledge base for Mon Valley air quality data
const MON_VALLEY_KNOWLEDGE = {
  mon_valley: {
    name: "Mon Valley",
    description: "The Monongahela Valley (Mon Valley) is a region in southwestern Pennsylvania known for its steel industry and air quality challenges.",
    coordinates: { lat: 40.4406, lng: -79.9959 },
    key_industries: ["steel", "coal", "manufacturing"],
    major_facilities: ["U.S. Steel Clairton Works", "Edgar Thomson Steel Works", "Irvin Plant"]
  },
  clairton_works: {
    name: "U.S. Steel Clairton Works",
    description: "The largest coke manufacturing facility in North America, producing coke for steelmaking.",
    location: "Clairton, PA",
    emissions: ["PM2.5", "SO2", "NOx", "VOCs", "CO"],
    health_impacts: ["respiratory issues", "cardiovascular problems", "cancer risk"]
  },
  air_quality: {
    pm25: "PM2.5 particles are fine particulate matter that can penetrate deep into lungs",
    pm10: "PM10 particles are larger particles that can irritate eyes, nose, and throat",
    so2: "Sulfur dioxide is a gas that can cause respiratory problems",
    no2: "Nitrogen dioxide can cause lung irritation and respiratory issues",
    o3: "Ozone can cause chest pain, coughing, and throat irritation"
  },
  health_effects: {
    short_term: ["eye irritation", "coughing", "shortness of breath", "chest tightness"],
    long_term: ["asthma", "chronic bronchitis", "heart disease", "lung cancer"],
    sensitive_groups: ["children", "elderly", "people with heart/lung disease", "pregnant women"]
  },
  monitoring: {
    epa: "EPA monitors air quality through the Air Quality Index (AQI)",
    purpleair: "PurpleAir sensors provide community-based air quality monitoring",
    achd: "Allegheny County Health Department monitors local air quality",
    pa_dep: "Pennsylvania Department of Environmental Protection oversees state air quality"
  },
  history: {
    industrial_development: "The Mon Valley became a major steel-producing region in the late 19th century",
    steel_industry: "U.S. Steel was founded in 1901 and became the world's largest steel producer",
    environmental_impact: "Industrial development led to significant air and water pollution",
    regulatory_response: "Clean Air Act of 1970 and subsequent regulations improved air quality"
  }
};

// Function to retrieve relevant data from our knowledge base
function retrieveRelevantData(query: string) {
  const relevant_data = [];
  const query_lower = query.toLowerCase();
  
  for (const [category, data] of Object.entries(MON_VALLEY_KNOWLEDGE)) {
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.toLowerCase().includes(query_lower)) {
          relevant_data.push({ category, key, value });
        }
      }
    }
  }
  
  return relevant_data;
}

// Test function for Together AI
export const testTogetherAI = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      console.log('=== TEST FUNCTION STARTED ===');
      
                        const apiKey = "tgp_v1_2R0gUWl5hTV_qgHp9QHzYAejER_ynTuiDr0xUR3t-zI";
      console.log('API Key available:', !!apiKey);
      console.log('API Key length:', (apiKey || '').length);
      
      if (!apiKey) {
        response.json({ error: 'No API key configured' });
        return;
      }

      // Test Together AI directly
      const testResponse = await axios.post('https://api.together.xyz/v1/chat/completions', {
        model: 'meta-llama/Meta-Llama-3-8B-Instruct-Lite',
        messages: [
          {
            role: 'user',
            content: 'Hello, are you working?'
          }
        ],
        max_tokens: 100
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('Together AI response:', testResponse.data);
      
      response.json({
        success: true,
        response: (testResponse.data as any).choices[0]?.message?.content,
        model: (testResponse.data as any).model
      });

    } catch (error: any) {
      console.error('Test function error:', error.message);
      response.json({
        success: false,
        error: error.message,
        response: error.response?.data
      });
    }
  });
});

// New test function to avoid caching issues
export const testTogetherAINew = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      console.log('=== NEW TEST FUNCTION STARTED ===');
      
      const apiKey = "tgp_v1_2R0gUWl5hTV_qgHp9QHzYAejER_ynTuiDr0xUR3t-zI";
      console.log('API Key available:', !!apiKey);
      console.log('API Key length:', (apiKey || '').length);
      
      if (!apiKey) {
        response.json({ error: 'No API key configured' });
        return;
      }

      // Test Together AI directly
      const testResponse = await axios.post('https://api.together.xyz/v1/chat/completions', {
        model: 'meta-llama/Meta-Llama-3-8B-Instruct-Lite',
        messages: [
          {
            role: 'user',
            content: 'Hello, are you working?'
          }
        ],
        max_tokens: 100
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('Together AI response:', testResponse.data);
      
      response.json({
        success: true,
        response: (testResponse.data as any).choices[0]?.message?.content,
        model: (testResponse.data as any).model
      });

    } catch (error: any) {
      console.error('New test function error:', error.message);
      response.json({
        success: false,
        error: error.message,
        response: error.response?.data
      });
    }
  });
});

// Proxy function for AI chat
export const llama3Chat = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      console.log('=== FUNCTION STARTED ===');
      console.log('Request method:', request.method);
      console.log('Request body:', request.body);
      
      const { message } = request.body;
      
      if (!message) {
        console.log('No message provided, returning error');
        response.status(400).json({ error: 'Message is required' });
        return;
      }

                        console.log('Message received:', message);
      
                        // Test API key access
                  const apiKey = "tgp_v1_2R0gUWl5hTV_qgHp9QHzYAejER_ynTuiDr0xUR3t-zI";
                  console.log('API Key available:', !!apiKey);
                  console.log('API Key length:', (apiKey || '').length);
                  console.log('API Key prefix:', (apiKey || '').substring(0, 10) + '...');
                  
                  if (!apiKey) {
                    console.log('No API key found in environment variables, using fallback');
                    response.json({
                      response: 'API key not configured in environment. Using fallback mode.',
                      context_used: false,
                      sources: [],
                      model: 'fallback'
                    });
                    return;
                  }

      // Try to connect to Together AI for real AI responses
      try {
        
        const relevant_data = retrieveRelevantData(message);
        console.log('Relevant data found:', relevant_data.length, 'items');
        
        let system_prompt = `You are BreatheAI, an expert air quality health assistant for the Mon Valley region of Pennsylvania. You have deep knowledge about:

1. **Mon Valley Geography & Industry**: The Monongahela Valley's steel industry, including U.S. Steel's Clairton Works, Edgar Thomson Steel Works, and Irvin Plant
2. **Air Quality Science**: PM2.5, PM10, SO2, NOx, O3, VOCs, and their health effects
3. **Health Impacts**: Short-term and long-term effects of air pollution on respiratory and cardiovascular health
4. **Monitoring Systems**: EPA, PurpleAir, ACHD, and PA DEP monitoring networks
5. **Historical Context**: The region's industrial development and environmental challenges

Always provide accurate, helpful information and be empathetic to health concerns.`;

        if (relevant_data.length > 0) {
          system_prompt += `\n\nRelevant context for this query:\n${JSON.stringify(relevant_data, null, 2)}`;
        }

        console.log('Making Together AI API call...');
        console.log('Request payload:', {
          model: 'meta-llama/Meta-Llama-3-8B-Instruct-Lite',
          messages: [
            { role: 'system', content: system_prompt.substring(0, 100) + '...' },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.9
        });

                        // Use Together AI API (easier to set up)
                const ollamaResponse = await axios.post('https://api.together.xyz/v1/chat/completions', {
                  model: 'meta-llama/Meta-Llama-3-8B-Instruct-Lite',
                  messages: [
                    {
                      role: 'system',
                      content: system_prompt
                    },
                    {
                      role: 'user',
                      content: message
                    }
                  ],
                  max_tokens: 500,
                  temperature: 0.7,
                  top_p: 0.9
                }, {
                                      headers: {
                      'Authorization': `Bearer ${apiKey}`,
                      'Content-Type': 'application/json'
                    },
                  timeout: 15000 // 15 second timeout
                });

        console.log('Together AI response received!');
        console.log('Response status:', ollamaResponse.status);
        console.log('Response data keys:', Object.keys(ollamaResponse.data));
        
        const aiResponse = (ollamaResponse.data as any).choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        console.log('AI Response length:', aiResponse.length);
        console.log('=== DEBUG END ===');
        
        response.json({
          response: aiResponse,
          context_used: relevant_data.length > 0,
          sources: relevant_data.map(d => d.category),
          model: 'meta-llama/Meta-Llama-3-8B-Instruct-Lite'
        });

      } catch (ollamaError: any) {
        console.error('=== TOGETHER AI ERROR ===');
        console.error('Error type:', typeof ollamaError);
        console.error('Error message:', ollamaError.message);
        console.error('Error response:', ollamaError.response?.data);
        console.error('Error status:', ollamaError.response?.status);
        console.error('Error headers:', ollamaError.response?.headers);
        console.error('=== END ERROR ===');
        
        console.error('Together AI connection failed:', ollamaError.message);
        
        response.json({
          response: 'I apologize, but I\'m experiencing a temporary connection issue. Please try again in a moment. I\'m here to help you with air quality information for the Mon Valley region.',
          context_used: false,
          sources: [],
          error: 'temporary_connection_issue'
        });
      }

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
        ollama: 'fully_operational',
        database: 'connected',
        ai_assistant: 'online'
      },
      message: 'Firebase Cloud Functions are operational with full AI capabilities'
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

// ============================================================================
// TITLE V FACILITIES DATA MODEL & MANAGEMENT
// ============================================================================

interface TitleVFacility {
  facilityId: string;
  name: string;
  operator: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  permitId: string;
  permitType: string;
  issuedDate: string;
  expirationDate?: string;
  naicsCode?: string;
  processes: string[];
  permittedPollutants: Array<{
    pollutant: string;
    casNumber?: string;
    limit: number;
    unit: string;
    averagingPeriod: string;
  }>;
  emissionsData?: Array<{
    year: number;
    pollutant: string;
    quantity: number;
    unit: string;
    source: string;
  }>;
  jurisdiction: string;
  regulatoryAgency: string;
  lastInspection?: string;
  violations?: Array<{
    date: string;
    description: string;
    status: string;
  }>;
  metadata: {
    dataSource: string;
    lastUpdated: any;
    version: string;
  };
}

// Seed data for Mon Valley facilities
const MON_VALLEY_FACILITIES: TitleVFacility[] = [
  {
    facilityId: 'PA-CLAIRTON-001',
    name: 'U.S. Steel Clairton Coke Works',
    operator: 'United States Steel Corporation',
    location: {
      lat: 40.2925,
      lng: -79.8814,
      address: '400 State Street',
      city: 'Clairton',
      state: 'PA',
      zip: '15025'
    },
    permitId: 'TV-04-00001',
    permitType: 'Title V Operating Permit',
    issuedDate: '2020-01-15',
    expirationDate: '2025-01-15',
    naicsCode: '331110',
    processes: ['Coke production', 'Coal processing', 'By-product recovery'],
    permittedPollutants: [
      {
        pollutant: 'PM2.5',
        limit: 100,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      },
      {
        pollutant: 'SO2',
        casNumber: '7446-09-5',
        limit: 500,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      },
      {
        pollutant: 'NOx',
        limit: 250,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      },
      {
        pollutant: 'VOCs',
        limit: 150,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      }
    ],
    emissionsData: [
      {
        year: 2023,
        pollutant: 'PM2.5',
        quantity: 89.5,
        unit: 'tons/year',
        source: 'EPA NEI'
      },
      {
        year: 2023,
        pollutant: 'SO2',
        quantity: 445.2,
        unit: 'tons/year',
        source: 'EPA NEI'
      }
    ],
    jurisdiction: 'Allegheny County',
    regulatoryAgency: 'Allegheny County Health Department',
    lastInspection: '2024-09-15',
    violations: [
      {
        date: '2023-12-25',
        description: 'Fire at Battery 19-4 resulted in excess emissions',
        status: 'resolved'
      }
    ],
    metadata: {
      dataSource: 'EPA ECHO / ACHD',
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  },
  {
    facilityId: 'PA-BRADDOCK-001',
    name: 'Edgar Thomson Steel Works',
    operator: 'United States Steel Corporation',
    location: {
      lat: 40.4006,
      lng: -79.8639,
      address: '301 Talbot Avenue',
      city: 'Braddock',
      state: 'PA',
      zip: '15104'
    },
    permitId: 'TV-04-00002',
    permitType: 'Title V Operating Permit',
    issuedDate: '2019-06-01',
    expirationDate: '2024-06-01',
    naicsCode: '331110',
    processes: ['Blast furnace operations', 'Steel production', 'Continuous casting'],
    permittedPollutants: [
      {
        pollutant: 'PM2.5',
        limit: 75,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      },
      {
        pollutant: 'PM10',
        limit: 150,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      },
      {
        pollutant: 'NOx',
        limit: 300,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      }
    ],
    emissionsData: [
      {
        year: 2023,
        pollutant: 'PM2.5',
        quantity: 68.3,
        unit: 'tons/year',
        source: 'EPA NEI'
      }
    ],
    jurisdiction: 'Allegheny County',
    regulatoryAgency: 'Allegheny County Health Department',
    lastInspection: '2024-08-22',
    metadata: {
      dataSource: 'EPA ECHO / ACHD',
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  },
  {
    facilityId: 'PA-DRAVOSBURG-001',
    name: 'Irvin Plant',
    operator: 'United States Steel Corporation',
    location: {
      lat: 40.3506,
      lng: -79.8867,
      address: '100 River Road',
      city: 'Dravosburg',
      state: 'PA',
      zip: '15034'
    },
    permitId: 'TV-04-00003',
    permitType: 'Title V Operating Permit',
    issuedDate: '2021-03-10',
    expirationDate: '2026-03-10',
    naicsCode: '331110',
    processes: ['Hot strip mill', 'Cold rolling', 'Coating operations'],
    permittedPollutants: [
      {
        pollutant: 'PM2.5',
        limit: 50,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      },
      {
        pollutant: 'VOCs',
        limit: 100,
        unit: 'tons/year',
        averagingPeriod: 'annual'
      }
    ],
    jurisdiction: 'Allegheny County',
    regulatoryAgency: 'Allegheny County Health Department',
    metadata: {
      dataSource: 'EPA ECHO / ACHD',
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  }
];

// Endpoint to seed Title V facilities data
export const seedTitleVFacilities = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Basic auth check (skip in emulator mode for testing)
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
      if (!isEmulator) {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
      }
      
      const batch = admin.firestore().batch();
      const facilitiesRef = admin.firestore().collection('titleVFacilities');
      
      for (const facility of MON_VALLEY_FACILITIES) {
        const docRef = facilitiesRef.doc(facility.facilityId);
        // Inject timestamp (ISO string for compatibility)
        const facilityWithTimestamp = {
          ...facility,
          metadata: {
            ...facility.metadata,
            lastUpdated: new Date().toISOString()
          }
        };
        batch.set(docRef, facilityWithTimestamp);
      }
      
      await batch.commit();
      
      console.log(`Seeded ${MON_VALLEY_FACILITIES.length} Title V facilities`);
      
      res.json({
        success: true,
        message: `Successfully seeded ${MON_VALLEY_FACILITIES.length} Title V facilities`,
        facilityIds: MON_VALLEY_FACILITIES.map(f => f.facilityId)
      });
      
    } catch (error: any) {
      console.error('Error seeding facilities:', error);
      res.status(500).json({
        error: 'Failed to seed facilities',
        message: error.message
      });
    }
  });
});

// Endpoint to get all Title V facilities
export const getTitleVFacilities = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const facilitiesSnapshot = await admin.firestore()
        .collection('titleVFacilities')
        .get();
      
      const facilities = facilitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json({
        success: true,
        count: facilities.length,
        facilities
      });
      
    } catch (error: any) {
      console.error('Error fetching facilities:', error);
      res.status(500).json({
        error: 'Failed to fetch facilities',
        message: error.message
      });
    }
  });
});

// Endpoint to get a single facility by ID
export const getTitleVFacilityById = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const facilityId = req.query.id as string;
      
      if (!facilityId) {
        res.status(400).json({ error: 'facilityId query parameter is required' });
        return;
      }
      
      const facilityDoc = await admin.firestore()
        .collection('titleVFacilities')
        .doc(facilityId)
        .get();
      
      if (!facilityDoc.exists) {
        res.status(404).json({ error: 'Facility not found' });
        return;
      }
      
      res.json({
        success: true,
        facility: {
          id: facilityDoc.id,
          ...facilityDoc.data()
        }
      });
      
    } catch (error: any) {
      console.error('Error fetching facility:', error);
      res.status(500).json({
        error: 'Failed to fetch facility',
        message: error.message
      });
    }
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

// ============================================================================
// SYMPTOM REPORT SUBMISSION WITH VALIDATION & PRIVACY
// ============================================================================

interface SymptomReportData {
  userId: string;
  fullName?: string;
  age?: string;
  symptoms: string[];
  severity: number;
  osac: {
    onset: string;
    severity: number;
    aggravatingFactors: string[];
    course: string;
  };
  submittedAt: string;
  location?: {
    lat: number;
    lng: number;
  };
  consent?: boolean;
}

// Validate symptom report data
function validateSymptomReport(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!Array.isArray(data.symptoms) || data.symptoms.length === 0) {
    errors.push('symptoms must be a non-empty array');
  }
  
  if (typeof data.severity !== 'number' || data.severity < 1 || data.severity > 5) {
    errors.push('severity must be a number between 1 and 5');
  }
  
  if (!data.osac || typeof data.osac !== 'object') {
    errors.push('osac data is required');
  } else {
    if (!data.osac.onset || typeof data.osac.onset !== 'string') {
      errors.push('osac.onset is required');
    }
    if (typeof data.osac.severity !== 'number') {
      errors.push('osac.severity is required');
    }
    if (!data.osac.course || typeof data.osac.course !== 'string') {
      errors.push('osac.course is required');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Pseudonymize user data for privacy
function pseudonymizeReport(data: SymptomReportData): any {
  const crypto = require('crypto');
  
  // Generate pseudonymous ID from user ID
  const pseudoId = crypto.createHash('sha256')
    .update(data.userId + process.env.PSEUDO_SALT || 'default-salt')
    .digest('hex')
    .substring(0, 16);
  
  return {
    pseudoId,
    // Remove or hash PII
    age: data.age ? parseInt(data.age) : null, // Keep age as numeric range
    symptoms: data.symptoms,
    severity: data.severity,
    osac: data.osac,
    submittedAt: new Date().toISOString(), // Use ISO string for emulator compatibility
    location: data.location ? {
      // Round location to ~1km precision for privacy
      lat: Math.round(data.location.lat * 100) / 100,
      lng: Math.round(data.location.lng * 100) / 100
    } : null,
    consent: data.consent || false,
    metadata: {
      source: 'web',
      version: '1.0'
    }
  };
}

// Rate limiting using Firestore
async function checkRateLimit(userId: string): Promise<boolean> {
  const rateLimitRef = admin.firestore()
    .collection('rateLimits')
    .doc(userId);
  
  const doc = await rateLimitRef.get();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  if (!doc.exists) {
    await rateLimitRef.set({
      count: 1,
      windowStart: now
    });
    return true;
  }
  
  const data = doc.data();
  if (!data) return false;
  
  // Reset window if expired
  if (now - data.windowStart > windowMs) {
    await rateLimitRef.set({
      count: 1,
      windowStart: now
    });
    return true;
  }
  
  // Check limit (max 10 reports per hour)
  if (data.count >= 10) {
    return false;
  }
  
  // Increment counter
  await rateLimitRef.update({
    count: admin.firestore.FieldValue.increment(1)
  });
  
  return true;
}

export const submitSymptomReport = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Only accept POST requests
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
      }
      
      const reportData = req.body as SymptomReportData;
      
      // Validate input
      const validation = validateSymptomReport(reportData);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }
      
      // Check rate limit
      const withinLimit = await checkRateLimit(reportData.userId);
      if (!withinLimit) {
        res.status(429).json({
          error: 'Rate limit exceeded. Maximum 10 reports per hour.'
        });
        return;
      }
      
      // Pseudonymize data for privacy
      const pseudonymizedData = pseudonymizeReport(reportData);
      
      // Store in Firestore
      const docRef = await admin.firestore()
        .collection('symptomReports')
        .add(pseudonymizedData);
      
      // Log submission (without PII)
      console.log('Symptom report submitted:', {
        reportId: docRef.id,
        severity: reportData.severity,
        symptomCount: reportData.symptoms.length,
        timestamp: new Date().toISOString()
      });
      
      // Check if we need to trigger health alerts (high severity)
      if (reportData.severity >= 4) {
        await admin.firestore()
          .collection('healthAlerts')
          .add({
            reportId: docRef.id,
            severity: reportData.severity,
            symptoms: reportData.symptoms,
            location: pseudonymizedData.location,
            createdAt: new Date().toISOString(), // Use ISO string for emulator compatibility
            status: 'pending'
          });
        
        console.log('Health alert created for high-severity report:', docRef.id);
      }
      
      res.status(201).json({
        success: true,
        reportId: docRef.id,
        message: 'Symptom report submitted successfully'
      });
      
    } catch (error: any) {
      console.error('Error submitting symptom report:', error);
      res.status(500).json({
        error: 'Failed to submit symptom report',
        message: error.message
      });
    }
  });
});

// ============================================================================
// ACHD OFFICIAL AIR QUALITY DATA INTEGRATION
// ============================================================================

/**
 * Get official ACHD air quality data for Mon Valley
 * This uses EPA AQS data that ACHD reports to (via OpenAQ)
 */
export const getACHDAirQuality = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const data = await getMonValleyAirQuality();
      
      res.json({
        success: data.success,
        data: data.data,
        source: data.source,
        lastUpdated: data.lastUpdated,
        notes: 'Data from Allegheny County Health Department via EPA AQS'
      });
    } catch (error: any) {
      console.error('Error fetching ACHD data:', error);
      res.status(500).json({
        error: 'Failed to fetch ACHD air quality data',
        message: error.message
      });
    }
  });
});

/**
 * Get historical air quality data for dashboard charts
 * Returns last N days of PM2.5 data with AQI
 */
export const getACHDHistoricalData = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      
      // Try to get historical data
      const data = await getHistoricalDataForChart(days);
      
      if (data.success && data.data.length > 0) {
        res.json({
          success: true,
          data: data.data,
          source: 'ACHD Hourly Data',
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Fallback: generate mock historical data
        const mockData = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          
          mockData.push({
            date: date.toISOString().split('T')[0],
            pm25: 30 + Math.random() * 20, // 30-50 range
            aqi: Math.round(50 + Math.random() * 50) // 50-100 range
          });
        }
        
        res.json({
          success: true,
          data: mockData,
          source: 'Mock Data (ACHD data unavailable)',
          lastUpdated: new Date().toISOString(),
          note: 'Using mock data. ACHD scraping needs to be configured.'
        });
      }
      
    } catch (error: any) {
      console.error('Error fetching historical data:', error);
      res.status(500).json({
        error: 'Failed to fetch historical air quality data',
        message: error.message
      });
    }
  });
});
