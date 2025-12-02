/**
 * Wind Data Service
 * Fetches real-time wind data for dispersion modeling and upwind facility detection
 */

export interface WindData {
  speed: number; // m/s
  direction: number; // degrees (0-360, 0 = North)
  gust?: number; // m/s
  timestamp: Date;
}

export interface WindVector {
  u: number; // Eastward component (m/s)
  v: number; // Northward component (m/s)
  speed: number; // Total speed (m/s)
  direction: number; // Direction in degrees
}

/**
 * Convert wind direction and speed to vector components
 */
export function windToVector(speed: number, direction: number): WindVector {
  // Convert direction from meteorological (0° = North, clockwise) to mathematical (0° = East, counterclockwise)
  const radians = ((direction - 90) * Math.PI) / 180;
  return {
    u: speed * Math.cos(radians), // Eastward
    v: speed * Math.sin(radians), // Northward
    speed,
    direction,
  };
}

/**
 * Get wind data from OpenWeatherMap API
 * @param lat Latitude
 * @param lng Longitude
 * @param apiKey OpenWeatherMap API key
 */
export async function getWindData(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<WindData | null> {
  try {
    const key = apiKey || process.env.VITE_OPENWEATHER_API_KEY;
    if (!key) {
      console.warn('OpenWeatherMap API key not configured');
      return null;
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.wind) {
      return {
        speed: data.wind.speed || 0, // m/s
        direction: data.wind.deg || 0, // degrees
        gust: data.wind.gust,
        timestamp: new Date(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching wind data:', error);
    return null;
  }
}

/**
 * Calculate dispersion factor (W_wind) based on wind speed
 * Stagnant air (inversion) increases risk; high wind decreases it
 * @param windSpeed Wind speed in m/s
 * @returns Dispersion factor (0.8 - 1.5)
 */
export function calculateDispersionFactor(windSpeed: number): number {
  // Very low wind (< 1 m/s) = stagnant air = higher risk
  if (windSpeed < 1) {
    return 1.5; // Maximum dispersion factor (pollution trapped)
  }
  
  // Low wind (1-3 m/s) = some dispersion
  if (windSpeed < 3) {
    return 1.2;
  }
  
  // Moderate wind (3-7 m/s) = good dispersion
  if (windSpeed < 7) {
    return 1.0; // Normal
  }
  
  // High wind (> 7 m/s) = excellent dispersion = lower risk
  return 0.8; // Minimum dispersion factor
}

/**
 * Determine if a facility is upwind of a sensor based on wind direction
 * @param sensorLat Sensor latitude
 * @param sensorLng Sensor longitude
 * @param facilityLat Facility latitude
 * @param facilityLng Facility longitude
 * @param windDirection Wind direction in degrees (0-360, 0 = North)
 * @returns true if facility is upwind
 */
export function isUpwind(
  sensorLat: number,
  sensorLng: number,
  facilityLat: number,
  facilityLng: number,
  windDirection: number
): boolean {
  // Calculate bearing from sensor to facility
  const lat1 = (sensorLat * Math.PI) / 180;
  const lat2 = (facilityLat * Math.PI) / 180;
  const dLng = ((facilityLng - sensorLng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  const normalizedBearing = (bearing + 360) % 360;

  // Wind blows FROM windDirection TO (windDirection + 180) % 360
  // Facility is upwind if it's in the direction the wind is coming from
  const windFrom = (windDirection + 180) % 360;
  const angleDiff = Math.abs(normalizedBearing - windFrom);
  const minAngle = Math.min(angleDiff, 360 - angleDiff);

  // Consider upwind if within 45 degrees
  return minAngle <= 45;
}

