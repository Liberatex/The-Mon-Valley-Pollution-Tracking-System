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
  // Base radius in kilometers based on severity - MUCH smaller for granular visualization
  const baseRadius: Record<string, number> = {
    moderate: 0.3,   // 300m - very granular
    high: 0.5,      // 500m
    severe: 0.8,    // 800m
    toxic: 1.2,     // 1.2km - still visible but not overwhelming
  };

  let radius = baseRadius[severity] || 0.3;

  // Adjust for wind speed (less aggressive scaling for smaller zones)
  // Low wind = slightly larger zone (pollution doesn't disperse)
  // High wind = slightly smaller zone (pollution disperses quickly)
  if (windData.speed < 2) {
    radius *= 1.2; // Stagnant air expands zone slightly
  } else if (windData.speed > 7) {
    radius *= 0.85; // High wind reduces zone slightly
  }

  // Create hexagon polygon centered on event
  const center = turf.point([centerLng, centerLat]);
  
  // Convert wind direction to bearing (0° = North, clockwise)
  const bearing = windData.direction;
  
  // Create hexagon polygon (6 sides)
  // Calculate hexagon vertices
  const hexagonVertices: number[][] = [];
  const numSides = 6;
  
  // Use radius directly (no need to make hexagon larger for small zones)
  const hexRadius = radius;
  
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

/**
 * Generate a hex grid overlay for granular risk visualization
 * Creates small hexagons covering the map area, each colored by local risk
 * @param bounds Map bounds {north, south, east, west}
 * @param hexSize Size of each hexagon in kilometers (default 0.5km for granular view)
 * @param sensorsWithRisk Array of sensors with calculated risk data
 * @returns Array of hexagon risk zones
 */
export function generateHexGridOverlay(
  bounds: { north: number; south: number; east: number; west: number },
  hexSize: number = 0.5, // 500m hexagons for granular visualization
  sensorsWithRisk: Array<{ lat: number; lng: number; riskIndex: number; riskLevel: string }>
): RiskZone[] {
  const hexZones: RiskZone[] = [];
  
  // Calculate hexagon spacing
  // Hexagons are arranged in a staggered grid
  const hexRadius = hexSize; // radius in km
  const hexWidth = hexSize * 2; // width of hexagon
  const hexHeight = hexSize * Math.sqrt(3); // height of hexagon
  
  // Convert bounds to approximate km offsets
  const latRange = bounds.north - bounds.south;
  const lngRange = bounds.east - bounds.west;
  
  // Approximate conversion: 1 degree lat ≈ 111 km, 1 degree lng ≈ 111 km * cos(lat)
  const avgLat = (bounds.north + bounds.south) / 2;
  const latKmPerDegree = 111;
  const lngKmPerDegree = 111 * Math.cos(avgLat * Math.PI / 180);
  
  // Calculate number of hexagons needed
  const cols = Math.ceil((lngRange * lngKmPerDegree) / (hexWidth * 0.75)) + 1;
  const rows = Math.ceil((latRange * latKmPerDegree) / hexHeight) + 1;
  
  // Generate hex grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Calculate hexagon center
      const lat = bounds.south + (row * hexHeight / latKmPerDegree);
      const lngOffset = (col * hexWidth * 0.75) / lngKmPerDegree;
      const lng = bounds.west + lngOffset;
      
      // Offset every other row for staggered grid
      const adjustedLng = row % 2 === 0 ? lng : lng + (hexWidth * 0.375 / lngKmPerDegree);
      
      // Find nearby sensors and calculate average risk
      const nearbySensors = sensorsWithRisk.filter(sensor => {
        const distance = Math.sqrt(
          Math.pow(sensor.lat - lat, 2) + Math.pow(sensor.lng - adjustedLng, 2)
        );
        const distanceKm = distance * 111; // Approximate conversion
        return distanceKm <= hexRadius * 2; // Include sensors within 2x hex radius
      });
      
      if (nearbySensors.length === 0) continue; // Skip hexagons with no nearby sensors
      
      // Calculate weighted average risk (closer sensors have more weight)
      let totalWeight = 0;
      let weightedRiskSum = 0;
      
      nearbySensors.forEach(sensor => {
        const distance = Math.sqrt(
          Math.pow(sensor.lat - lat, 2) + Math.pow(sensor.lng - adjustedLng, 2)
        );
        const distanceKm = distance * 111;
        const weight = Math.max(0, 1 - (distanceKm / (hexRadius * 2))); // Inverse distance weighting
        totalWeight += weight;
        weightedRiskSum += sensor.riskIndex * weight;
      });
      
      const avgRiskIndex = totalWeight > 0 ? weightedRiskSum / totalWeight : 0;
      
      // Determine risk level from average risk index
      let riskLevel: RiskZone['riskLevel'] = 'elevated';
      if (avgRiskIndex >= 100) {
        riskLevel = 'toxic';
      } else if (avgRiskIndex >= 75) {
        riskLevel = 'severe';
      } else if (avgRiskIndex >= 50) {
        riskLevel = 'high';
      } else if (avgRiskIndex >= 10) {
        // Lowered threshold to 10 to show zones even with low PM2.5 readings
        riskLevel = 'elevated';
      } else {
        continue; // Skip hexagons with very low risk
      }
      
      // Create hexagon polygon
      const hexagonVertices: number[][] = [];
      
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * (Math.PI / 180);
        const latOffset = hexRadius * 0.009 * Math.cos(angle);
        const lngOffset = hexRadius * 0.009 * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
        hexagonVertices.push([adjustedLng + lngOffset, lat + latOffset]);
      }
      hexagonVertices.push(hexagonVertices[0]); // Close polygon
      
      const hexagon = turf.polygon([hexagonVertices]);
      
      hexZones.push({
        polygon: hexagon,
        riskLevel,
        affectedArea: turf.area(hexagon) / 1000000,
      });
    }
  }
  
  return hexZones;
}

