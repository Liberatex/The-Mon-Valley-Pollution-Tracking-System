/**
 * Risk Zone Service
 * Generates dynamic polygons for affected areas based on pollution events
 * Uses Turf.js for geospatial analysis
 */

import * as turf from '@turf/turf';
import { WindData } from './windDataService';

export interface RiskZone {
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
  riskLevel: 'elevated' | 'high' | 'severe' | 'toxic';
  affectedArea: number; // square kilometers
  affectedUsers?: number; // Number of users in zone
}

/**
 * Generate risk zone polygon based on pollution event and wind
 * @param centerLat Center latitude of pollution event
 * @param centerLng Center longitude of pollution event
 * @param windData Wind speed and direction
 * @param severity Event severity (affects zone size)
 * @returns Risk zone polygon
 */
export function generateRiskZone(
  centerLat: number,
  centerLng: number,
  windData: WindData,
  severity: 'moderate' | 'high' | 'severe' | 'toxic' = 'moderate'
): RiskZone {
  // Base radius in kilometers based on severity
  const baseRadius: Record<string, number> = {
    moderate: 2,
    high: 5,
    severe: 10,
    toxic: 15,
  };

  let radius = baseRadius[severity] || 2;

  // Adjust for wind speed
  // Low wind = larger zone (pollution doesn't disperse)
  // High wind = smaller zone (pollution disperses quickly)
  if (windData.speed < 2) {
    radius *= 1.5; // Stagnant air expands zone
  } else if (windData.speed > 7) {
    radius *= 0.7; // High wind reduces zone
  }

  // Create hexagon polygon centered on event
  const center = turf.point([centerLng, centerLat]);
  
  // Convert wind direction to bearing (0° = North, clockwise)
  const bearing = windData.direction;
  
  // Create hexagon polygon (6 sides)
  // Calculate hexagon vertices
  const hexagonVertices: number[][] = [];
  const numSides = 6;
  
  // Adjust radius for hexagon (make it slightly larger to account for hexagon shape)
  const hexRadius = radius * 1.1;
  
  for (let i = 0; i < numSides; i++) {
    // Calculate angle for each vertex (60 degrees apart)
    // Rotate hexagon based on wind direction
    const angle = (i * 60 + bearing) * (Math.PI / 180);
    
    // Calculate vertex position
    // Convert km to degrees (approximate: 1 km ≈ 0.009 degrees at this latitude)
    const latOffset = hexRadius * 0.009 * Math.cos(angle);
    const lngOffset = hexRadius * 0.009 * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
    
    hexagonVertices.push([
      centerLng + lngOffset,
      centerLat + latOffset
    ]);
  }
  
  // Close the polygon by adding the first vertex at the end
  hexagonVertices.push(hexagonVertices[0]);
  
  // Create hexagon polygon
  const hexagon = turf.polygon([hexagonVertices]);

  return {
    polygon: hexagon,
    riskLevel: severity as RiskZone['riskLevel'],
    affectedArea: turf.area(hexagon) / 1000000, // Convert to km²
  };
}

/**
 * Check if a point (user location) is within a risk zone
 * @param lat Latitude
 * @param lng Longitude
 * @param zone Risk zone polygon
 * @returns true if point is in zone
 */
export function isPointInRiskZone(
  lat: number,
  lng: number,
  zone: RiskZone
): boolean {
  const point = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(point, zone.polygon);
}

/**
 * Find all users within a risk zone
 * @param zone Risk zone
 * @param userLocations Array of user locations
 * @returns Array of user IDs in zone
 */
export function findUsersInRiskZone(
  zone: RiskZone,
  userLocations: Array<{ userId: string; lat: number; lng: number }>
): string[] {
  return userLocations
    .filter((user) => isPointInRiskZone(user.lat, user.lng, zone))
    .map((user) => user.userId);
}

/**
 * Detect pollution events that require risk zones
 * @param sensors Array of sensor readings
 * @param smellReports Array of smell reports
 * @param thresholds Event detection thresholds
 * @returns Array of detected events
 */
export function detectPollutionEvents(
  sensors: Array<{ lat: number; lng: number; pm25: number }>,
  smellReports: Array<{ lat: number; lng: number; smellValue: number }>,
  thresholds: {
    pm25Threshold: number; // μg/m³
    smellThreshold: number; // Number of reports
    smellValueThreshold: number; // Average smell value (1-5)
  } = {
    pm25Threshold: 50,
    smellThreshold: 10,
    smellValueThreshold: 4,
  }
): Array<{ lat: number; lng: number; severity: string }> {
  const events: Array<{ lat: number; lng: number; severity: string }> = [];

  // Check for high PM2.5 events
  sensors.forEach((sensor) => {
    if (sensor.pm25 >= thresholds.pm25Threshold) {
      // Check if there are also smell reports nearby
      const nearbySmells = smellReports.filter((smell) => {
        const distance = Math.sqrt(
          Math.pow(smell.lat - sensor.lat, 2) +
            Math.pow(smell.lng - sensor.lng, 2)
        );
        return distance < 0.02; // ~2km
      });

      if (nearbySmells.length >= thresholds.smellThreshold) {
        const avgSmell =
          nearbySmells.reduce((sum, s) => sum + s.smellValue, 0) /
          nearbySmells.length;

        if (avgSmell >= thresholds.smellValueThreshold) {
          // High PM + High Smell = Severe/Toxic event
          events.push({
            lat: sensor.lat,
            lng: sensor.lng,
            severity: sensor.pm25 > 100 ? 'toxic' : 'severe',
          });
        } else {
          // High PM only = High risk
          events.push({
            lat: sensor.lat,
            lng: sensor.lng,
            severity: 'high',
          });
        }
      } else {
        // High PM without smell = Elevated risk
        events.push({
          lat: sensor.lat,
          lng: sensor.lng,
          severity: 'elevated',
        });
      }
    }
  });

  return events;
}

