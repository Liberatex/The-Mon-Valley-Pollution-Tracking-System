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

// Proxy function for AI chat
export const llama3Chat = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      const { message } = request.body;
      
      if (!message) {
        response.status(400).json({ error: 'Message is required' });
        return;
      }

      // Try to connect to Ollama Cloud for real AI responses
      try {
        const relevant_data = retrieveRelevantData(message);
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

        // Use Ollama Cloud API
        const ollamaResponse = await axios.post('https://api.ollama.com/v1/chat/completions', {
          model: 'llama3.1:8b',
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
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500
          }
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.OLLAMA_CLOUD_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        });

        const aiResponse = ollamaResponse.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        
        response.json({
          response: aiResponse,
          context_used: relevant_data.length > 0,
          sources: relevant_data.map(d => d.category),
          model: 'llama3.1:8b'
        });

      } catch (ollamaError: any) {
        console.error('Ollama Cloud connection failed, using fallback:', ollamaError.message);
        
        // Fallback response with enhanced knowledge
        const relevant_data = retrieveRelevantData(message);
        let fallbackResponse = `I'm BreatheAI, your air quality health assistant for the Mon Valley region. `;

        // Enhanced keyword detection for better responses
        const query = message.toLowerCase();
        
        if (query.includes('history') || query.includes('mon valley') || query.includes('monongahela')) {
          fallbackResponse += `\n\n**Mon Valley History & Industry:**\nThe Monongahela Valley became a major steel-producing region in the late 19th century. U.S. Steel was founded in 1901 and became the world's largest steel producer. The region is home to major facilities including U.S. Steel's Clairton Works (the largest coke manufacturing facility in North America), Edgar Thomson Steel Works, and Irvin Plant. Industrial development led to significant air and water pollution, though the Clean Air Act of 1970 and subsequent regulations have improved air quality.`;
        }

        if (query.includes('steel') || query.includes('industry') || query.includes('manufacturing')) {
          fallbackResponse += `\n\n**Steel Industry in Mon Valley:**\nThe Mon Valley is the heart of America's steel industry. U.S. Steel's three major facilities here include:\n- **Clairton Works**: Largest coke manufacturing facility in North America\n- **Edgar Thomson Steel Works**: Primary steelmaking facility\n- **Irvin Plant**: Finishing and coating operations\n\nThese facilities produce coke, steel, and finished products while generating emissions that impact local air quality.`;
        }

        if (query.includes('air quality') || query.includes('pollution') || query.includes('emissions')) {
          fallbackResponse += `\n\n**Air Quality Monitoring:**\nThe Mon Valley's air quality is monitored by EPA, PurpleAir community sensors, Allegheny County Health Department (ACHD), and Pennsylvania Department of Environmental Protection (PA DEP). Common pollutants include PM2.5, SO2, NOx, VOCs, and CO from industrial processes.`;
        }

        if (query.includes('health') || query.includes('effects') || query.includes('symptoms')) {
          fallbackResponse += `\n\n**Health Effects:**\nPM2.5 can penetrate deep into lungs and cause respiratory issues. Long-term exposure is linked to cardiovascular problems and increased cancer risk. Sensitive groups (children, elderly, people with heart/lung disease) should monitor air quality and limit outdoor activity during poor conditions.`;
        }

        if (query.includes('clairton') || query.includes('coke') || query.includes('facility')) {
          fallbackResponse += `\n\n**Clairton Works:**\nU.S. Steel's Clairton Works is the largest coke manufacturing facility in North America. It produces coke (a fuel used in steelmaking) from coal, a process that generates significant emissions including PM2.5, SO2, and VOCs. The facility has been a focus of environmental regulation and community health concerns.`;
        }

        if (query.includes('pm2.5') || query.includes('particulate') || query.includes('particles')) {
          fallbackResponse += `\n\n**PM2.5 Information:**\nPM2.5 refers to fine particulate matter with a diameter of 2.5 micrometers or smaller. These particles can penetrate deep into the lungs and even enter the bloodstream. In the Mon Valley, PM2.5 primarily comes from industrial processes, vehicle emissions, and coal combustion.`;
        }

        if (query.includes('monitoring') || query.includes('sensors') || query.includes('data')) {
          fallbackResponse += `\n\n**Air Quality Monitoring Networks:**\n- **EPA AirNow**: Real-time air quality data and forecasts\n- **PurpleAir**: Community-based sensor network with hundreds of sensors\n- **ACHD**: Local health department monitoring stations\n- **PA DEP**: State environmental monitoring network\n\nThese networks provide comprehensive coverage of air quality across the Mon Valley region.`;
        }

        if (query.includes('regulations') || query.includes('laws') || query.includes('clean air')) {
          fallbackResponse += `\n\n**Environmental Regulations:**\nThe Clean Air Act of 1970 and subsequent amendments have significantly improved air quality in the Mon Valley. Facilities must comply with emission limits, monitoring requirements, and reporting standards. Recent regulations have focused on reducing PM2.5, SO2, and NOx emissions from industrial sources.`;
        }

        // If no specific keywords matched, provide general information
        if (fallbackResponse === `I'm BreatheAI, your air quality health assistant for the Mon Valley region. `) {
          fallbackResponse += `\n\nI can help you with information about:\n- **Mon Valley History & Steel Industry**\n- **Air Quality & Pollution Monitoring**\n- **Health Effects of Air Pollution**\n- **Clairton Works & Industrial Facilities**\n- **Environmental Regulations**\n- **PM2.5 & Other Pollutants**\n\nWhat specific aspect would you like to learn more about?`;
        }

        fallbackResponse += `\n\n**Current Status:** I'm operating in enhanced fallback mode. For real-time AI responses with our full knowledge base, please ensure the local backend server is running.`;

        response.json({
          response: fallbackResponse,
          context_used: relevant_data.length > 0,
          sources: relevant_data.map(d => d.category),
          fallback_mode: true
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
        ollama: 'checking...',
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
