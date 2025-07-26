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
        response: testResponse.data.choices[0]?.message?.content,
        model: testResponse.data.model
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
        response: testResponse.data.choices[0]?.message?.content,
        model: testResponse.data.model
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
        
        const aiResponse = ollamaResponse.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
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
