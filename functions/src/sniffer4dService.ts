/**
 * Sniffer4D Drone Data Service
 * Handles MQTT stream processing and 3D point cloud data
 */

export interface Sniffer4DReading {
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
    altitude: number; // meters above ground
  };
  no2: number; // ppb
  so2: number; // ppb
  voc: number; // ppb
  pm25?: number; // μg/m³
}

export interface FlightSession {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  readings: Sniffer4DReading[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    minAltitude: number;
    maxAltitude: number;
  };
}

/**
 * Process MQTT message from Sniffer4D drone
 * Expected MQTT topic: sniffer4d/monvalley/{droneId}/data
 * Message format: JSON with lat, lng, altitude, no2, so2, voc, pm25
 */
export function processSniffer4DMessage(
  topic: string,
  message: string
): Sniffer4DReading | null {
  try {
    const data = JSON.parse(message);

    // Validate required fields
    if (
      !data.lat ||
      !data.lng ||
      data.altitude === undefined ||
      data.no2 === undefined ||
      data.so2 === undefined ||
      data.voc === undefined
    ) {
      console.error('Invalid Sniffer4D message format');
      return null;
    }

    return {
      timestamp: new Date(data.timestamp || Date.now()),
      location: {
        lat: data.lat,
        lng: data.lng,
        altitude: data.altitude,
      },
      no2: data.no2,
      so2: data.so2,
      voc: data.voc,
      pm25: data.pm25,
    };
  } catch (error) {
    console.error('Error processing Sniffer4D message:', error);
    return null;
  }
}

/**
 * Aggregate readings into flight session
 */
export function createFlightSession(
  readings: Sniffer4DReading[]
): FlightSession | null {
  if (readings.length === 0) {
    return null;
  }

  const timestamps = readings.map((r) => r.timestamp.getTime());
  const lats = readings.map((r) => r.location.lat);
  const lngs = readings.map((r) => r.location.lng);
  const altitudes = readings.map((r) => r.location.altitude);

  return {
    sessionId: `flight_${Date.now()}`,
    startTime: new Date(Math.min(...timestamps)),
    endTime: new Date(Math.max(...timestamps)),
    readings,
    bounds: {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
      minAltitude: Math.min(...altitudes),
      maxAltitude: Math.max(...altitudes),
    },
  };
}

/**
 * Convert flight session to GeoJSON for Mapbox 3D visualization
 */
export function flightSessionToGeoJSON(session: FlightSession): any {
  return {
    type: 'FeatureCollection',
    features: session.readings.map((reading) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          reading.location.lng,
          reading.location.lat,
          reading.location.altitude,
        ],
      },
      properties: {
        no2: reading.no2,
        so2: reading.so2,
        voc: reading.voc,
        pm25: reading.pm25,
        timestamp: reading.timestamp.toISOString(),
      },
    })),
  };
}

/**
 * Detect pollution plumes from 3D data
 */
export function detectPlume(
  session: FlightSession,
  threshold: { no2: number; so2: number; voc: number } = {
    no2: 50, // ppb
    so2: 75, // ppb
    voc: 100, // ppb
  }
): Array<{
  center: { lat: number; lng: number; altitude: number };
  intensity: number;
  chemicals: string[];
}> {
  const plumes: Array<{
    center: { lat: number; lng: number; altitude: number };
    intensity: number;
    chemicals: string[];
  }> = [];

  // Group readings by proximity (3D clustering)
  const processed = new Set<number>();
  const clusterRadius = 0.001; // ~100m in degrees
  const altitudeRadius = 50; // meters

  session.readings.forEach((reading, index) => {
    if (processed.has(index)) return;

    // Find nearby readings
    const nearby = session.readings.filter((r, idx) => {
      if (processed.has(idx)) return false;
      const latDiff = Math.abs(r.location.lat - reading.location.lat);
      const lngDiff = Math.abs(r.location.lng - reading.location.lng);
      const altDiff = Math.abs(r.location.altitude - reading.location.altitude);
      return (
        latDiff < clusterRadius &&
        lngDiff < clusterRadius &&
        altDiff < altitudeRadius
      );
    });

    // Check if cluster exceeds thresholds
    const chemicals: string[] = [];
    let maxIntensity = 0;

    nearby.forEach((r) => {
      if (r.no2 > threshold.no2) {
        chemicals.push('NO2');
        maxIntensity = Math.max(maxIntensity, r.no2 / threshold.no2);
      }
      if (r.so2 > threshold.so2) {
        chemicals.push('SO2');
        maxIntensity = Math.max(maxIntensity, r.so2 / threshold.so2);
      }
      if (r.voc > threshold.voc) {
        chemicals.push('VOC');
        maxIntensity = Math.max(maxIntensity, r.voc / threshold.voc);
      }
    });

    if (chemicals.length > 0) {
      // Calculate cluster center
      const avgLat =
        nearby.reduce((sum, r) => sum + r.location.lat, 0) / nearby.length;
      const avgLng =
        nearby.reduce((sum, r) => sum + r.location.lng, 0) / nearby.length;
      const avgAlt =
        nearby.reduce((sum, r) => sum + r.location.altitude, 0) /
        nearby.length;

      plumes.push({
        center: { lat: avgLat, lng: avgLng, altitude: avgAlt },
        intensity: maxIntensity,
        chemicals: [...new Set(chemicals)], // Remove duplicates
      });

      // Mark as processed
      nearby.forEach((_, idx) => {
        const originalIdx = session.readings.indexOf(nearby[idx]);
        if (originalIdx >= 0) processed.add(originalIdx);
      });
    }
  });

  return plumes;
}

