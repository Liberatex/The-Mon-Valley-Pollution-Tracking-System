/**
 * IQAir (AirVisual) Service
 * Provides indoor/outdoor air quality differentiation
 */

export interface IQAirDevice {
  deviceId: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    indoor: boolean;
  };
  pm25: number;
  pm10: number;
  co2?: number;
  temperature?: number;
  humidity?: number;
  aqi: number;
  timestamp: Date;
}

export interface IndoorOutdoorComparison {
  outdoor: IQAirDevice;
  indoor: IQAirDevice;
  recommendation: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
}

/**
 * Fetch IQAir device data
 * @param deviceId IQAir device ID
 * @param apiKey IQAir API key
 */
export async function fetchIQAirDevice(
  deviceId: string,
  apiKey?: string
): Promise<IQAirDevice | null> {
  try {
    const key = apiKey || process.env.VITE_IQAIR_API_KEY;
    if (!key) {
      console.warn('IQAir API key not configured');
      return null;
    }

    // IQAir AirVisual API endpoint
    // Endpoint: https://api.airvisual.com/v2/device
    // For now, return mock data structure
    // Full implementation would call: GET https://api.airvisual.com/v2/device?deviceId={deviceId}&key={apiKey}

    return null; // Placeholder - requires API key
  } catch (error) {
    console.error('Error fetching IQAir device data:', error);
    return null;
  }
}

/**
 * Compare indoor vs outdoor air quality and generate recommendation
 */
export function compareIndoorOutdoor(
  outdoor: IQAirDevice,
  indoor: IQAirDevice
): IndoorOutdoorComparison {
  let recommendation = '';
  let riskLevel: IndoorOutdoorComparison['riskLevel'] = 'low';

  // Scenario 1: Outdoor is toxic, indoor is safe
  if (outdoor.aqi >= 150 && indoor.aqi < 50) {
    recommendation =
      'Outdoor air is toxic. Your indoor air is safe. Recommendation: Shelter in Place. Do not open windows.';
    riskLevel = 'severe';
  }
  // Scenario 2: Outdoor is moderate, indoor is good
  else if (outdoor.aqi >= 50 && outdoor.aqi < 100 && indoor.aqi < 50) {
    recommendation =
      'Outdoor air quality is moderate. Your indoor air is good. Recommendation: Limit outdoor exposure, especially for sensitive individuals.';
    riskLevel = 'moderate';
  }
  // Scenario 3: Indoor sources detected
  else if (outdoor.aqi < 50 && indoor.aqi >= 100) {
    recommendation =
      'Indoor sources detected. Outdoor air is clean. Recommendation: Ventilate immediately. Check for indoor sources (cooking, cleaning products, etc.).';
    riskLevel = 'high';
  }
  // Scenario 4: Both are good
  else if (outdoor.aqi < 50 && indoor.aqi < 50) {
    recommendation =
      'Both indoor and outdoor air quality are good. Enjoy the fresh air!';
    riskLevel = 'low';
  }
  // Scenario 5: Both are poor
  else if (outdoor.aqi >= 100 && indoor.aqi >= 100) {
    recommendation =
      'Both indoor and outdoor air quality are poor. Recommendation: Use air purifiers, close windows, and consider relocating if symptoms worsen.';
    riskLevel = 'severe';
  }
  // Default
  else {
    recommendation =
      'Monitor both indoor and outdoor air quality. Take protective measures if symptoms develop.';
    riskLevel = 'moderate';
  }

  return {
    outdoor,
    indoor,
    recommendation,
    riskLevel,
  };
}

/**
 * Calculate ventilation recommendation based on CO2 levels
 */
export function getVentilationRecommendation(
  indoorCO2: number,
  outdoorAQI: number
): string {
  // High CO2 (>1000 ppm) indicates poor ventilation
  if (indoorCO2 > 1000 && outdoorAQI < 50) {
    return 'High CO2 levels detected. Outdoor air is clean. Recommendation: Open windows for ventilation.';
  } else if (indoorCO2 > 1000 && outdoorAQI >= 50) {
    return 'High CO2 levels detected, but outdoor air quality is poor. Recommendation: Use mechanical ventilation or air purifier instead of opening windows.';
  } else if (indoorCO2 < 1000) {
    return 'Ventilation appears adequate.';
  }

  return 'Monitor CO2 levels and outdoor air quality.';
}

