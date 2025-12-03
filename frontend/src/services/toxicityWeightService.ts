/**
 * Toxicity Weight Service (Frontend)
 * Calculates W_tox using TRI facility data
 * This is a frontend wrapper for TRI-based toxicity weight calculation
 */

export interface TRIFacility {
  facilityId: string;
  registryId: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  totalToxicityScore: number;
  airReleases?: Array<{
    chemical: string;
    quantity: number;
    toxicityScore: number;
  }>;
}

/**
 * Calculate Toxicity Weight (W_tox) for a sensor location
 * Based on proximity to TRI facilities and wind direction
 * @param sensorLat Sensor latitude
 * @param sensorLng Sensor longitude
 * @param facilities Array of TRI facilities
 * @param windDirection Wind direction in degrees (0-360, meteorological: where wind comes FROM)
 * @returns Toxicity weight multiplier (1.0 - 2.0)
 */
export function calculateToxicityWeight(
  sensorLat: number,
  sensorLng: number,
  facilities: TRIFacility[],
  windDirection: number
): number {
  let totalWeight = 1.0; // Base weight

  facilities.forEach((facility) => {
    // Calculate distance to facility (Haversine approximation)
    const latDiff = facility.location.lat - sensorLat;
    const lngDiff = facility.location.lng - sensorLng;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    // Convert distance to kilometers (rough approximation: 0.01 degrees ≈ 1km)
    const distanceKm = distance * 111;

    // Check if sensor is downwind of facility
    // Wind direction is meteorological (where wind comes FROM)
    // We want to check if sensor is downwind (wind blows TO sensor)
    const bearing = Math.atan2(lngDiff, latDiff) * (180 / Math.PI);
    const relativeBearing = (bearing + 360) % 360;
    const windRelative = (windDirection + 360) % 360;
    
    // Check if sensor is within 45 degrees of downwind
    // Downwind means wind is blowing FROM facility TO sensor
    const angleDiff = Math.abs(relativeBearing - windRelative);
    const isDownwind = angleDiff < 45 || angleDiff > 315;

    // Only apply toxicity weight if sensor is downwind and within ~5km
    if (isDownwind && distanceKm < 5) {
      // Weight by distance (closer = higher weight)
      const distanceWeight = 1 - (distanceKm / 5); // 1.0 at facility, 0 at 5km
      
      // Weight by toxicity score (normalize to 0-1 range)
      // Higher toxicity score = higher weight
      // Normalize assuming max toxicity score of ~20
      const toxicityContribution = Math.min(1.0, facility.totalToxicityScore / 20) * distanceWeight;
      
      // Add contribution (max additional weight of 0.5 per facility)
      totalWeight += toxicityContribution * 0.5;
    }
  });

  // Cap at 2.0 as per VCAN requirements
  return Math.min(2.0, Math.max(1.0, totalWeight));
}


