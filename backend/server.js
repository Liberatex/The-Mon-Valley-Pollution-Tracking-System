const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Custom knowledge base for Mon Valley air quality data
const MON_VALLEY_KNOWLEDGE = {
  location: {
    name: "Mon Valley",
    description: "The Monongahela Valley in southwestern Pennsylvania, home to major steel mills including U.S. Steel's Clairton Works",
    coordinates: { lat: 40.292, lng: -79.881 },
    key_industries: ["Steel manufacturing", "Coke production", "Chemical processing"]
  },
  air_quality_sources: {
    epa: "Environmental Protection Agency air quality standards and monitoring",
    purpleair: "Community air quality sensors providing real-time PM2.5 data",
    nasa: "Satellite-based air quality monitoring and forecasting",
    openweathermap: "Weather and air quality data for the region",
    achd: "Allegheny County Health Department air quality monitoring",
    pa_dep: "Pennsylvania Department of Environmental Protection"
  },
  health_effects: {
    pm25: "Fine particulate matter that can penetrate deep into lungs",
    pm10: "Coarse particulate matter that can irritate respiratory system",
    so2: "Sulfur dioxide from industrial processes, can cause respiratory issues",
    no2: "Nitrogen dioxide from combustion, can aggravate asthma",
    o3: "Ground-level ozone, can cause breathing problems"
  },
  steel_mill_emissions: {
    clairton_works: "U.S. Steel's Clairton Works - largest coke plant in North America",
    emissions: ["PM2.5", "PM10", "SO2", "NOx", "VOCs", "Heavy metals"],
    health_impacts: "Increased respiratory issues, cardiovascular problems, and cancer risk"
  }
};

// Function to retrieve relevant data from our knowledge base
function retrieveRelevantData(query) {
  const query_lower = query.toLowerCase();
  let relevant_data = [];
  
  // Check for location-specific queries
  if (query_lower.includes('mon valley') || query_lower.includes('clairton') || query_lower.includes('steel mill')) {
    relevant_data.push(MON_VALLEY_KNOWLEDGE.location);
    relevant_data.push(MON_VALLEY_KNOWLEDGE.steel_mill_emissions);
  }
  
  // Check for air quality queries
  if (query_lower.includes('air quality') || query_lower.includes('aqi') || query_lower.includes('pollution')) {
    relevant_data.push(MON_VALLEY_KNOWLEDGE.air_quality_sources);
  }
  
  // Check for health-related queries
  if (query_lower.includes('health') || query_lower.includes('symptom') || query_lower.includes('effect')) {
    relevant_data.push(MON_VALLEY_KNOWLEDGE.health_effects);
  }
  
  // Check for specific pollutants
  if (query_lower.includes('pm2.5') || query_lower.includes('pm10') || query_lower.includes('so2') || query_lower.includes('no2')) {
    relevant_data.push(MON_VALLEY_KNOWLEDGE.health_effects);
  }
  
  return relevant_data;
}

// Enhanced chat endpoint with RAG integration
app.post('/api/llama3-chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    // Retrieve relevant data from our knowledge base
    const relevant_data = retrieveRelevantData(message);
    
    // Create a context-aware prompt
    let system_prompt = `You are BreatheAI, an expert air quality health assistant for the Mon Valley region of Pennsylvania. 
    
You have access to specialized knowledge about:
- Mon Valley geography and industrial activity
- Air quality monitoring sources (EPA, PurpleAir, NASA, etc.)
- Health effects of air pollution
- Steel mill emissions and their impacts
- Local air quality data and trends

Always provide accurate, helpful information and prioritize user health and safety.`;

    let user_prompt = message;
    
    // If we have relevant data, include it in the context
    if (relevant_data.length > 0) {
      system_prompt += `\n\nRelevant context for this query:\n${JSON.stringify(relevant_data, null, 2)}`;
    }
    
    // Call Ollama API
    const ollamaResponse = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'llama3:latest',
      prompt: `${system_prompt}\n\nUser: ${user_prompt}\n\nBreatheAI:`,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 500
      }
    });
    
    const response = ollamaResponse.data.response || 'Sorry, I could not generate a response.';
    
    res.json({
      response: response.trim(),
      context_used: relevant_data.length > 0,
      sources: relevant_data.length > 0 ? Object.keys(relevant_data[0]) : []
    });
    
  } catch (error) {
    console.error('Ollama API error:', error.message);
    
    // Fallback response if Ollama is not available
    const fallback_response = `I'm BreatheAI, your air quality health assistant for the Mon Valley region. I'm currently experiencing technical difficulties, but I can help you with:

- Air quality information for the Mon Valley area
- Health effects of air pollution
- Steel mill emissions and their impacts
- Local air quality monitoring data

Please try again in a moment, or contact support if the issue persists.`;
    
    res.json({
      response: fallback_response,
      context_used: false,
      error: error.message
    });
  }
});

// Test endpoint to verify Ollama connection
app.get('/api/ollama-test', async (req, res) => {
  try {
    const response = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'llama3:latest',
      prompt: 'Hello, this is a test message. Please respond with "Ollama is working correctly."',
      stream: false
    });
    
    res.json({
      status: 'success',
      message: 'Ollama connection successful',
      response: response.data.response,
      model: 'llama3:latest'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Ollama connection failed',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      backend: 'running',
      ollama: 'checking...'
    }
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`BreatheAI backend listening on port ${PORT}`);
  console.log(`Ollama integration enabled`);
  console.log(`RAG knowledge base loaded with ${Object.keys(MON_VALLEY_KNOWLEDGE).length} categories`);
}); 