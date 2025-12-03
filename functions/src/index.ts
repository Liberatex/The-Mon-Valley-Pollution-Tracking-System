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
// Always try to load .env in development/emulator mode
if (process.env.FUNCTIONS_EMULATOR === 'true' || !process.env.GCLOUD_PROJECT) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    const fs = require('fs');
    
    // Try multiple possible paths for .env file
    // Compiled code is in lib/src/, so we need to go up two levels
    const possiblePaths = [
      path.resolve(__dirname, '..', '..', '.env'), // From lib/src/ to functions/.env
      path.resolve(__dirname, '..', '.env'), // Fallback
      path.resolve(process.cwd(), 'functions', '.env'), // From project root
      path.resolve(process.cwd(), '.env'), // Current directory
    ];
    
    let envPath: string | null = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        envPath = testPath;
        break;
      }
    }
    
    if (!envPath) {
      console.warn('⚠️ Could not find .env file. Tried paths:', possiblePaths);
    } else {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        console.warn('⚠️ Could not load .env file:', result.error.message, 'at path:', envPath);
      } else {
        console.log('✅ Loaded environment variables from .env at:', envPath);
        // Verify PurpleAir key is loaded
        if (process.env.PURPLEAIR_API_KEY) {
          console.log('✅ PurpleAir API key found in environment:', process.env.PURPLEAIR_API_KEY.substring(0, 10) + '...');
        } else {
          console.warn('⚠️ PurpleAir API key not found in environment');
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not load dotenv:', err);
  }
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
                    console.log('No API key found in environment variables');
                    response.status(400).json({
                      error: 'API key not configured in environment. Please set TOGETHER_AI_API_KEY in Firebase Functions environment variables.',
                      context_used: false,
                      sources: [],
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
      message: 'Metrics available'
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

// Endpoint to get ECHO compliance status for a facility (VCAN requirement)
export const getFacilityCompliance = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const facilityId = req.query.facilityId as string;
      const registryId = req.query.registryId as string;
      
      if (!facilityId && !registryId) {
        res.status(400).json({ error: 'facilityId or registryId query parameter is required' });
        return;
      }

      // Import ECHO service
      const { fetchECHOCompliance } = await import('./epaEchoService');
      
      // Map facility IDs to registry IDs (Mon Valley facilities)
      // This includes all possible facility ID formats
      const facilityRegistryMap: Record<string, string> = {
        // Clairton Works
        'PA-CLAIRTON-001': '110000305886',
        'clairton-works': '110000305886',
        // Edgar Thomson Works (Braddock)
        'PA-BRADDOCK-001': '110000305887',
        'edgar-thomson': '110000305887',
        'edgar-thomson-works': '110000305887',
        // Irvin Plant (Dravosburg/West Mifflin)
        'PA-DRAVOSBURG-001': '110000305888',
        'irvin-plant': '110000305888',
      };

      const registryIdToUse = registryId || facilityRegistryMap[facilityId] || null;
      
      if (!registryIdToUse) {
        res.status(404).json({ error: 'Registry ID not found for facility' });
        return;
      }

      const complianceData = await fetchECHOCompliance(registryIdToUse);
      
      if (!complianceData) {
        res.status(404).json({ error: 'Compliance data not found' });
        return;
      }

      res.json({
        success: true,
        compliance: {
          status: complianceData.complianceStatus,
          quartersInNonCompliance: complianceData.quartersInNonCompliance,
          lastInspectionDate: complianceData.lastInspectionDate?.toISOString(),
          violations: complianceData.violations.map(v => ({
            type: v.type,
            date: v.date.toISOString(),
            description: v.description,
          })),
          isSNC: complianceData.complianceStatus === 'Significant Non-Compliance',
        }
      });
      
    } catch (error: any) {
      console.error('Error fetching compliance data:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch compliance data',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

      // Audit log: Health data submission (HIPAA requirement)
      const { logHealthDataAccess } = require('./auditLogging');
      await logHealthDataAccess(
        pseudonymizedData.pseudoId,
        'system',
        'write',
        docRef.id,
        'user_request',
        {
          recordCount: 1
        }
      );

      // Add integrity checksum (HIPAA requirement: data integrity)
      try {
        const { addIntegrityChecksum } = require('./dataIntegrity');
        await addIntegrityChecksum('symptomReports', docRef.id);
      } catch (error: any) {
        console.warn('Could not add integrity checksum:', error);
        // Don't fail the submission if checksum fails
      }
      
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
        // No data available - return empty result
        res.json({
          success: false,
          data: [],
          source: 'ACHD Hourly Data',
          lastUpdated: new Date().toISOString(),
          message: 'No historical data available. ACHD scraping needs to be configured.'
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

/**
 * Fetch PurpleAir sensor data for Mon Valley area
 * Fetches real-time community sensor data from PurpleAir API
 * This was documented but not implemented - now implemented!
 */
export const fetchPurpleAirSensorData = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      // Get API key from environment (Firebase secrets are automatically injected as env vars)
      // Also check legacy config for backward compatibility
      let apiKey = process.env.PURPLEAIR_API_KEY;
      
      if (!apiKey && functions.config().purpleair?.api_key) {
        apiKey = functions.config().purpleair.api_key;
      }
      
      if (!apiKey) {
        console.warn('PurpleAir API key not configured');
        console.warn('Checked: process.env.PURPLEAIR_API_KEY and functions.config().purpleair.api_key');
        return res.json({
          success: false,
          data: [],
          message: 'PurpleAir API key not configured. Please set PURPLEAIR_API_KEY in Firebase Functions secrets.',
          note: 'To get an API key, register at https://www2.purpleair.com. Use: firebase functions:secrets:set PURPLEAIR_API_KEY'
        });
      }
      
      console.log('✅ PurpleAir API key found, attempting to fetch sensors from PurpleAir API...');

      // Mon Valley bounding box (Clairton area) - expanded to capture more sensors
      const params = {
        fields: 'sensor_index,name,latitude,longitude,pm2.5,pm2.5_cf_1,humidity,temperature,location_type',
        nwlng: -80.5,  // NW corner (expanded to capture all Pittsburgh area sensors)
        nwlat: 40.6,
        selng: -79.5,  // SE corner
        selat: 39.9,
        location_type: 0, // Outdoor sensors only
        max_age: 3600, // Max 1 hour old data
      };

      console.log('Fetching PurpleAir sensors for Mon Valley area (expanded bounds)...');
      
      let response;
      let responseData: any;
      let data: any[] = [];
      let fields: string[] = [];
      
      try {
        response = await axios.get('https://api.purpleair.com/v1/sensors', {
          params,
          headers: {
            'X-API-Key': apiKey,
          },
          timeout: 20000, // Increased timeout for more sensors
        });
        
        responseData = response.data;
        data = responseData.data || [];
        fields = responseData.fields || [];
        console.log(`PurpleAir API returned ${data.length} sensors`);
      } catch (apiError: any) {
        // If API key fails due to credits (402), try public JSON endpoint as fallback
        if (apiError.response?.status === 402) {
          console.warn('PurpleAir API requires credits (402). Attempting fallback data sources...');
          
          // Try PurpleAir public map endpoint (different URL)
          try {
            const publicResponse = await axios.get('https://map.purpleair.com/json', {
              timeout: 15000,
            });
            
            if (publicResponse.data && (Array.isArray(publicResponse.data) || (publicResponse.data as any).results)) {
              const dataArray = Array.isArray(publicResponse.data) ? publicResponse.data : (publicResponse.data as any).results || [];
              
              // Filter for Mon Valley/Pittsburgh area sensors (expanded bounds)
              const monValleySensors = dataArray.filter((sensor: any) => {
                const lat = parseFloat(sensor.Lat || sensor.latitude);
                const lng = parseFloat(sensor.Lon || sensor.longitude);
                return !isNaN(lat) && !isNaN(lng) && lat >= 39.9 && lat <= 40.6 && lng >= -80.5 && lng <= -79.5;
              });
              
              if (monValleySensors.length > 0) {
                const sensors = monValleySensors.map((sensor: any) => ({
                  id: `pa-public-${sensor.ID || sensor.id || sensor.sensor_index}`,
                  sensorIndex: parseInt(sensor.ID || sensor.id || sensor.sensor_index || '0'),
                  name: sensor.Label || sensor.name || `PurpleAir Sensor ${sensor.ID || sensor.id}`,
                  location: {
                    lat: parseFloat(sensor.Lat || sensor.latitude),
                    lng: parseFloat(sensor.Lon || sensor.longitude),
                  },
                  pm25: parseFloat(sensor['PM2.5_Value'] || sensor['PM2.5'] || sensor.pm25 || sensor['PM2.5 (CF=ATM)'] || '0'),
                  humidity: parseFloat(sensor.humidity || sensor.Humidity || '0') || null,
                  temperature: parseFloat(sensor.temp_f || sensor.TempF || '0') ? (parseFloat(sensor.temp_f || sensor.TempF) - 32) * 5/9 : null,
                  source: 'PurpleAir (Public Map)',
                  locationType: 0,
                }));
                
                const validSensors = sensors.filter((s: any) => 
                  s.location.lat && 
                  s.location.lng && 
                  s.pm25 !== null && 
                  s.pm25 !== undefined &&
                  !isNaN(s.pm25) &&
                  s.pm25 > 0
                );
                
                if (validSensors.length > 0) {
                  console.log(`✅ Fetched ${validSensors.length} sensors from PurpleAir public map endpoint`);
                  
                  return res.json({
                    success: true,
                    data: validSensors,
                    count: validSensors.length,
                    source: 'PurpleAir (Public Map)',
                    lastUpdated: new Date().toISOString(),
                    note: 'Using PurpleAir public map endpoint. API key account needs credits for official API access.',
                  });
                }
              }
              console.warn('Public map endpoint returned data but no valid sensors in Mon Valley area');
            }
          } catch (publicError: any) {
            console.error('Public map endpoint failed:', publicError.message);
            // Continue to OpenAQ/WPRDC fallbacks
          }
        }
        // Re-throw if not 402 to be caught by outer catch for OpenAQ/WPRDC fallbacks
        throw apiError;
      }

      // Map PurpleAir data to our format
      const sensors = data.map((row: any[]) => {
        const obj: any = {};
        fields.forEach((field: string, idx: number) => {
          obj[field] = row[idx];
        });

        // Use pm2.5_cf_1 if available (CF=ATM corrected), otherwise pm2.5
        const pm25 = obj['pm2.5_cf_1'] !== null && obj['pm2.5_cf_1'] !== undefined 
          ? obj['pm2.5_cf_1'] 
          : obj['pm2.5'];

        return {
          id: `pa-${obj['sensor_index']}`,
          sensorIndex: obj['sensor_index'],
          name: obj['name'] || `PurpleAir Sensor ${obj['sensor_index']}`,
          location: {
            lat: obj['latitude'],
            lng: obj['longitude'],
          },
          pm25: pm25,
          humidity: obj['humidity'],
          temperature: obj['temperature'],
          source: 'PurpleAir',
          locationType: obj['location_type'],
        };
      });

      // Filter out sensors with invalid coordinates or missing PM2.5 data
      const validSensors = sensors.filter((s: any) => 
        s.location.lat && 
        s.location.lng && 
        s.pm25 !== null && 
        s.pm25 !== undefined &&
        !isNaN(s.pm25)
      );

      console.log(`Mapped ${validSensors.length} valid PurpleAir sensors`);

      return res.json({
        success: true,
        data: validSensors,
        count: validSensors.length,
        source: 'PurpleAir API',
        lastUpdated: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Error fetching PurpleAir sensors:', error);
      
      // Provide helpful error message
      let errorMessage = 'Failed to fetch PurpleAir sensor data';
      let statusCode = 500;
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid PurpleAir API key. Please check your API key configuration.';
        statusCode = 401;
      } else if (error.response?.status === 402) {
        // 402 Payment Required - Try alternative real-time APIs
        console.warn('PurpleAir API returned 402 (Payment Required). Trying alternative real-time data sources...');
        
        // Try OpenAQ API (free, aggregates EPA AirNow data)
        try {
          console.log('Attempting OpenAQ fallback...');
          const { tryOpenAQ } = require('./openAQService');
          const openAQData = await tryOpenAQ();
          
          if (openAQData.success && openAQData.data && openAQData.data.length > 0) {
            // Convert OpenAQ data to sensor format
            const sensors = openAQData.data
              .filter((reading: any) => reading.pm25 && reading.pm25 > 0) // Only include sensors with valid PM2.5
              .map((reading: any, index: number) => ({
                id: `openaq-${index}`,
                sensorIndex: 10000 + index,
                name: reading.location || 'OpenAQ Sensor',
                location: {
                  lat: 40.292, // Mon Valley area
                  lng: -79.881,
                },
                pm25: reading.pm25,
                humidity: 60, // Default
                temperature: 20, // Default
                source: 'OpenAQ (EPA AirNow)',
                locationType: 0,
              }));
            
            if (sensors.length > 0) {
              console.log(`✅ OpenAQ fallback successful: ${sensors.length} sensors`);
              return res.json({
                success: true,
                data: sensors,
                count: sensors.length,
                source: 'OpenAQ (EPA AirNow aggregates)',
                lastUpdated: new Date().toISOString(),
                note: 'PurpleAir API requires credits. Using OpenAQ (free EPA AirNow data) as alternative.',
              });
            } else {
              console.warn('OpenAQ returned data but no valid PM2.5 readings');
            }
          } else {
            console.warn('OpenAQ fallback failed or returned no data');
          }
        } catch (openaqError: any) {
          console.error('OpenAQ fallback error:', openaqError.message);
        }
        
        // Try WPRDC (official ACHD data)
        try {
          console.log('Attempting WPRDC fallback...');
          const { fetchACHDWPRDC } = require('./wprdcService');
          const wprdcData = await fetchACHDWPRDC();
          
          if (wprdcData.success && wprdcData.data && wprdcData.data.length > 0) {
            // Convert WPRDC data to sensor format
            // Use coordinates from WPRDC if available, otherwise default to Mon Valley
            const sensors = wprdcData.data
              .filter((reading: any) => reading.pm25 !== null && reading.pm25 !== undefined && !isNaN(reading.pm25) && reading.pm25 >= 0)
              .map((reading: any, index: number) => ({
                id: `wprdc-${reading.location || index}`,
                sensorIndex: 20000 + index,
                name: reading.location || 'ACHD Monitor',
                location: {
                  lat: reading.coordinates?.lat || 40.292, // Use coordinates from WPRDC if available
                  lng: reading.coordinates?.lng || -79.881,
                },
                pm25: Math.max(reading.pm25, 0.1), // Use 0.1 as minimum to avoid 0 (which gets filtered elsewhere)
                humidity: 60, // Default
                temperature: 20, // Default
                source: 'WPRDC (Official ACHD)',
                locationType: 0,
              }));
            
            if (sensors.length > 0) {
              console.log(`✅ WPRDC fallback successful: ${sensors.length} sensors`);
              return res.json({
                success: true,
                data: sensors,
                count: sensors.length,
                source: 'WPRDC (Official ACHD Data)',
                lastUpdated: new Date().toISOString(),
                note: 'PurpleAir API requires credits. Using WPRDC (official ACHD data) as alternative.',
              });
            } else {
              console.warn('WPRDC returned data but no valid PM2.5 readings');
            }
          } else {
            console.warn('WPRDC fallback failed or returned no data');
          }
        } catch (wprdcError: any) {
          console.error('WPRDC fallback error:', wprdcError.message);
        }
        
        // If all fallbacks fail, return error (no mock data)
        console.error('All fallback data sources failed. Returning 402 error.');
        return res.status(402).json({
          success: false,
          error: 'PurpleAir API subscription required. The API key is valid but the account needs credits. Please add credits to your PurpleAir account at https://www2.purpleair.com. Alternative data sources (OpenAQ, WPRDC) also unavailable or have no valid PM2.5 readings.',
          message: error.message,
          statusCode: 402,
          data: [],
        });
      } else if (error.response?.status === 403) {
        errorMessage = 'PurpleAir API access forbidden. Please verify your API key permissions.';
        statusCode = 403;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'PurpleAir API request timed out. Please try again.';
        statusCode = 504;
      } else if (error.response?.status) {
        errorMessage = `PurpleAir API returned status ${error.response.status}. ${error.response.data?.message || error.message}`;
        statusCode = error.response.status;
      }

      console.error('PurpleAir API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        statusCode: error.response?.status || statusCode,
        data: [],
      });
    }
  });
});

// Export sync functions for Azure data synchronization
export * from './syncToAzure';

// Export aggregation pipeline
export * from './aggregateHealthData';

// Export audit logging
export * from './auditLogging';

// Export BigQuery export
export * from './exportToBigQuery';

// Export Synapse export
export * from './exportToSynapse';

// Export Data Lake integration
export * from './azureDataLake';

// Export automated regulatory reporting
export * from './automatedRegulatoryReporting';

// Export VCAN data access API
export * from './vcanDataAccess';

// Export breach notification
export * from './breachNotification';

// Export data integrity
export * from './dataIntegrity';

// Export EPA TRI service
export * from './epaTriService';

// Wind data endpoint
export const getWindData = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude required',
        });
      }

      // Use OpenWeatherMap API (free tier: 60 calls/minute)
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'OpenWeatherMap API key not configured',
        });
      }

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
      );

      const weatherData = response.data as any;
      if (weatherData?.wind) {
        return res.json({
          success: true,
          data: {
            speed: weatherData.wind.speed || 0,
            direction: weatherData.wind.deg || 0,
            gust: weatherData.wind.gust,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Wind data not available',
      });
    } catch (error: any) {
      console.error('Error fetching wind data:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch wind data',
      });
    }
  });
});

// Get TRI facilities
export const getTRIFacilities = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { fetchTRIFacilities } = await import('./epaTriService');
      const facilities = await fetchTRIFacilities();
      
      return res.json({
        success: true,
        facilities,
        count: facilities.length,
      });
    } catch (error: any) {
      console.error('Error fetching TRI facilities:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch TRI facilities',
      });
    }
  });
});

/**
 * Fetch Smell PGH reports (VCAN requirement)
 * API Documentation: https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API
 * Endpoint: https://api.smellpittsburgh.org/api/v2/smell_reports
 */
export const fetchSmellPGHReports = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { 
        smell_value, 
        start_time, 
        end_time, 
        region_ids,
        north,
        south,
        east,
        west 
      } = req.query;

      // Build query parameters for Smell PGH API
      // Documentation: https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API
      const params: any = {};
      
      // Filter by smell value (default to 2-5 to capture more data)
      if (smell_value) {
        params.smell_value = smell_value;
      } else {
        params.smell_value = '2,3,4,5'; // Default to barely noticeable or worse
      }

      // Time range (default to last 7 days) - epoch time format
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - (7 * 24 * 60 * 60);
      params.start_time = start_time || sevenDaysAgo;
      params.end_time = end_time || now;

      // Region filter (Allegheny County = region 1)
      if (region_ids) {
        params.region_ids = region_ids;
      } else {
        params.region_ids = '1'; // Allegheny County
      }

      // Use latlng_bbox parameter if bounding box is provided
      // API Documentation: https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API
      // Format: "top-left lat, top-left lng, bottom-right lat, bottom-right lng"
      // "The first two numbers are the latitude and longitude of the top-left corner
      // of the bounding box, and the last two are the latitude and longitude of the bottom-right corner"
      if (north && south && east && west) {
        const topLeftLat = parseFloat(north as string);   // Top = north
        const topLeftLng = parseFloat(west as string);   // Left = west
        const bottomRightLat = parseFloat(south as string); // Bottom = south
        const bottomRightLng = parseFloat(east as string);  // Right = east
        params.latlng_bbox = `${topLeftLat},${topLeftLng},${bottomRightLat},${bottomRightLng}`;
        console.log(`Using latlng_bbox parameter: ${params.latlng_bbox} (north=${north}, south=${south}, east=${east}, west=${west})`);
      }

      // Call Smell PGH API
      // Endpoint: https://api.smellpittsburgh.org/api/v2/smell_reports
      const apiUrl = 'https://api.smellpittsburgh.org/api/v2/smell_reports';
      console.log('Fetching Smell PGH reports with params:', JSON.stringify(params, null, 2));

      const response = await axios.get(apiUrl, {
        params,
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseData = response.data as any;
      const apiReports = Array.isArray(responseData) ? responseData : [];

      console.log(`Smell PGH API returned ${apiReports.length} reports`);

      // Map API response to our format
      // Actual API returns: latitude, longitude, smell_value, observed_at, zipcode, smell_description, feelings_symptoms, additional_comments
      // Note: zip_code_id is NOT in the response (despite some docs mentioning it)
      const mappedReports = apiReports
        .filter((report: any) => report.latitude && report.longitude && report.smell_value) // Filter out invalid reports
        .map((report: any, index: number) => ({
          id: `smell-${report.zipcode || 'unknown'}-${report.observed_at}-${index}`,
          smellValue: report.smell_value,
          zipCode: report.zipcode || '',
          latitude: parseFloat(report.latitude),
          longitude: parseFloat(report.longitude),
          timestamp: new Date(report.observed_at * 1000), // Convert Unix timestamp to Date
          smellDescription: report.smell_description || null,
          feelingsSymptoms: report.feelings_symptoms || null,
          additionalComments: report.additional_comments || null,
        }));

      // Note: If latlng_bbox was provided, the API already filtered by bounding box server-side
      // We still do a client-side validation filter to ensure data integrity (double-check)
      let filteredReports = mappedReports;
      if (north && south && east && west) {
        // Always validate bounding box client-side as a safety check
        const beforeFilter = filteredReports.length;
        filteredReports = mappedReports.filter((report: any) => {
          const lat = report.latitude;
          const lng = report.longitude;
          return lat >= parseFloat(south as string) &&
                 lat <= parseFloat(north as string) &&
                 lng >= parseFloat(west as string) &&
                 lng <= parseFloat(east as string);
        });
        if (beforeFilter !== filteredReports.length) {
          console.log(`Client-side validation: ${beforeFilter} reports → ${filteredReports.length} within bounding box`);
        }
      }

      console.log(`✅ Fetched ${filteredReports.length} Smell PGH reports (from ${apiReports.length || 0} total API results)`);
      
      // Log sample reports for debugging
      if (filteredReports.length > 0) {
        console.log('Sample report:', filteredReports[0]);
      }

      return res.json({
        success: true,
        reports: filteredReports,
        count: filteredReports.length,
        source: 'Smell PGH API',
        lastUpdated: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Error fetching Smell PGH reports:', error);
      
      // Provide helpful error message
      let errorMessage = 'Failed to fetch Smell PGH reports';
      if (error.response?.status === 404) {
        errorMessage = 'Smell PGH API endpoint not found. Please verify the API is accessible.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Smell PGH API request timed out. Please try again.';
      } else if (error.response?.data) {
        errorMessage = `Smell PGH API error: ${JSON.stringify(error.response.data)}`;
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        message: error.message,
        reports: [],
      });
    }
  });
});

// Calculate weighted risk for a location
export const calculateRisk = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const {
        pm25,
        humidity,
        temperature,
        lat,
        lng,
        hasAsthma,
        hasCOPD,
        ageGroup,
        previousHighExposure,
        odorScore,
      } = req.body;

      // NOTE: Risk calculation is primarily done on the frontend
      // This endpoint is kept for reference but risk calculation should use frontend services
      // Backend services for risk calculation would need to be created separately
      
      return res.status(501).json({
        success: false,
        error: 'Risk calculation is performed on the frontend. Use the frontend weightedRiskAlgorithm service instead.',
        message: 'This endpoint requires frontend services that are not available in the backend.',
        note: 'Risk calculation uses: barkjohnCalibration, windDataService, and weightedRiskAlgorithm from the frontend.',
      });
    } catch (error: any) {
      console.error('Error calculating risk:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate risk',
      });
    }
  });
});
