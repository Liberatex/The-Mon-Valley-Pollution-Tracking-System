/**
 * OSAC Framework for BreatheAI
 * OSAC = Odors, Symptoms, Actions, Causes
 * Structures symptom reporting conversations
 */

export interface OSACData {
  odors: string[];
  symptoms: string[];
  actions: string[];
  causes: string[];
  location: {
    lat?: number;
    lng?: number;
    indoor?: boolean;
  };
  timestamp: Date;
}

export interface OSACQuestion {
  category: 'odors' | 'symptoms' | 'actions' | 'causes';
  question: string;
  options?: string[];
  required: boolean;
}

/**
 * NLP classifier for symptom detection
 * Maps user input to symptom categories
 */
export function classifySymptom(input: string): {
  category: string;
  confidence: number;
  keywords: string[];
} {
  const lowerInput = input.toLowerCase();

  // Symptom keywords mapping
  const symptomMap: Record<string, string[]> = {
    respiratory: ['breathing', 'breath', 'cough', 'wheeze', 'chest tight', 'shortness'],
    eye: ['eye', 'irritat', 'water', 'burn', 'red'],
    nose: ['nose', 'runny', 'stuffy', 'sneeze'],
    throat: ['throat', 'sore', 'scratchy', 'dry'],
    headache: ['headache', 'head', 'migraine'],
    nausea: ['nausea', 'nauseous', 'sick', 'stomach'],
    dizziness: ['dizzy', 'lightheaded', 'faint'],
  };

  let bestMatch = { category: 'general', confidence: 0, keywords: [] as string[] };

  Object.entries(symptomMap).forEach(([category, keywords]) => {
    const matches = keywords.filter((keyword) => lowerInput.includes(keyword));
    if (matches.length > 0) {
      const confidence = matches.length / keywords.length;
      if (confidence > bestMatch.confidence) {
        bestMatch = { category, confidence, keywords: matches };
      }
    }
  });

  return bestMatch;
}

/**
 * Odor detection from user input
 */
export function detectOdor(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const odors: string[] = [];

  const odorKeywords: Record<string, string[]> = {
    'rotten egg': ['rotten egg', 'sulfur', 'h2s', 'hydrogen sulfide'],
    'chemical': ['chemical', 'solvent', 'paint', 'gas'],
    'smoke': ['smoke', 'burning', 'fire'],
    'metallic': ['metallic', 'metal', 'iron'],
    'sweet': ['sweet', 'fruity', 'syrup'],
  };

  Object.entries(odorKeywords).forEach(([odor, keywords]) => {
    if (keywords.some((keyword) => lowerInput.includes(keyword))) {
      odors.push(odor);
    }
  });

  return odors;
}

/**
 * Generate OSAC questions based on current state
 */
export function generateOSACQuestions(
  currentData: Partial<OSACData>,
  userInput: string
): OSACQuestion[] {
  const questions: OSACQuestion[] = [];

  // If no symptoms detected yet, ask about symptoms
  if (!currentData.symptoms || currentData.symptoms.length === 0) {
    const classification = classifySymptom(userInput);
    if (classification.confidence > 0) {
      questions.push({
        category: 'symptoms',
        question: 'Are you experiencing any other symptoms? (e.g., eye irritation, headache, nausea)',
        required: false,
      });
    }
  }

  // If symptoms but no odors, ask about odors
  if (currentData.symptoms && currentData.symptoms.length > 0 && !currentData.odors) {
    questions.push({
      category: 'odors',
      question: 'Do you smell anything unusual? (e.g., rotten egg, chemical, smoke)',
      required: false,
    });
  }

  // If odors detected, ask about location
  if (currentData.odors && currentData.odors.length > 0 && !currentData.location.indoor) {
    questions.push({
      category: 'actions',
      question: 'Are you indoors or outdoors right now?',
      options: ['Indoors', 'Outdoors'],
      required: true,
    });
  }

  // If we have symptoms and odors, ask about actions taken
  if (
    currentData.symptoms &&
    currentData.symptoms.length > 0 &&
    currentData.odors &&
    currentData.odors.length > 0
  ) {
    questions.push({
      category: 'actions',
      question: 'What actions have you taken? (e.g., closed windows, activated air purifier, left area)',
      required: false,
    });
  }

  return questions;
}

/**
 * Correlate OSAC data with nearby sensor data
 */
export async function correlateWithSensors(
  osacData: OSACData,
  sensors: Array<{ lat: number; lng: number; pm25: number }>
): Promise<{
  correlation: 'high' | 'medium' | 'low' | 'none';
  nearbySensors: Array<{ distance: number; pm25: number }>;
  recommendation: string;
}> {
  if (!osacData.location.lat || !osacData.location.lng) {
    return {
      correlation: 'none',
      nearbySensors: [],
      recommendation: 'Unable to correlate - location not provided',
    };
  }

  // Find nearby sensors (within 2km)
  const nearbySensors = sensors
    .map((sensor) => {
      const distance = Math.sqrt(
        Math.pow(sensor.lat - osacData.location.lat!, 2) +
          Math.pow(sensor.lng - osacData.location.lng!, 2)
      );
      return { distance, pm25: sensor.pm25 };
    })
    .filter((s) => s.distance < 0.02) // ~2km
    .sort((a, b) => a.distance - b.distance);

  if (nearbySensors.length === 0) {
    return {
      correlation: 'none',
      nearbySensors: [],
      recommendation: 'No nearby sensors found. Your report has been logged.',
    };
  }

  const avgPM25 =
    nearbySensors.reduce((sum, s) => sum + s.pm25, 0) / nearbySensors.length;
  const maxPM25 = Math.max(...nearbySensors.map((s) => s.pm25));

  // Determine correlation
  let correlation: 'high' | 'medium' | 'low' | 'none' = 'low';
  if (maxPM25 > 50 && osacData.symptoms.length > 0) {
    correlation = 'high';
  } else if (avgPM25 > 35 && osacData.symptoms.length > 0) {
    correlation = 'medium';
  }

  // Generate recommendation
  let recommendation = '';
  if (correlation === 'high') {
    recommendation = `We have logged your symptoms. Nearby sensors show elevated PM2.5 (${maxPM25.toFixed(1)} μg/m³). This correlates with your report. Recommendation: Activate your air purifier and consider limiting outdoor exposure.`;
  } else if (correlation === 'medium') {
    recommendation = `Your symptoms have been logged. Nearby air quality is moderate (${avgPM25.toFixed(1)} μg/m³). Monitor your symptoms and consider taking protective measures if they worsen.`;
  } else {
    recommendation = `Your report has been logged. Nearby sensors show relatively low PM2.5 levels. If symptoms persist, consider consulting a healthcare provider.`;
  }

  return {
    correlation,
    nearbySensors,
    recommendation,
  };
}

