/**
 * Backend Infrastructure Planning
 * PostGIS, TimescaleDB, Redis cache layer, Lambda architecture
 */

/**
 * Database Schema Planning
 * 
 * PostgreSQL with PostGIS:
 * - sensors (id, location POINT, pm25, timestamp)
 * - facilities (id, location POINT, name, permit_number)
 * - health_reports (id, user_id_hash, location POINT, symptoms, timestamp)
 * 
 * TimescaleDB (time-series):
 * - sensor_readings (time, sensor_id, pm25, humidity, temperature)
 * - health_reports_time (time, user_id_hash, symptom_count)
 * 
 * Redis Cache:
 * - sensor:latest:{sensorId} - Latest reading
 * - sensors:monvalley - All Mon Valley sensors (GeoJSON)
 * - wind:latest:{lat}:{lng} - Latest wind data
 * - risk:latest:{lat}:{lng} - Latest risk calculation
 */

/**
 * Lambda/Cloud Function Architecture:
 * 
 * 1. Data Ingestion Layer (every 60 seconds):
 *    - fetchPurpleAirSensors() - Polls PurpleAir API, writes to Redis
 *    - fetchSmellPGH() - Polls Smell PGH API, writes to PostgreSQL
 *    - fetchWindData() - Polls OpenWeatherMap, writes to Redis
 * 
 * 2. Processing Layer (triggered by ingestion):
 *    - calibrateSensorData() - Applies Barkjohn calibration
 *    - calculateRiskScores() - Calculates Weighted Risk for all grid cells
 *    - detectPollutionEvents() - Detects events requiring risk zones
 * 
 * 3. Aggregation Layer (scheduled, daily):
 *    - aggregateDailyData() - Daily summaries
 *    - aggregateWeeklyData() - Weekly summaries
 *    - aggregateMonthlyData() - Monthly summaries
 * 
 * 4. API Layer (on-demand):
 *    - getLatestSensors() - Reads from Redis
 *    - getRiskScore() - Calculates on-demand or reads from cache
 *    - getHealthProfile() - Reads from encrypted vault
 */

/**
 * Example PostGIS query for finding sensors within radius
 */
export const POSTGIS_QUERY_EXAMPLE = `
SELECT 
  id,
  name,
  pm25,
  ST_Distance(
    location,
    ST_MakePoint($1, $2)::geography
  ) AS distance_meters
FROM sensors
WHERE ST_DWithin(
  location,
  ST_MakePoint($1, $2)::geography,
  $3 -- radius in meters
)
ORDER BY distance_meters
LIMIT 10;
`;

/**
 * Example TimescaleDB query for time-series data
 */
export const TIMESCALE_QUERY_EXAMPLE = `
SELECT 
  time_bucket('1 hour', timestamp) AS hour,
  sensor_id,
  AVG(pm25) AS avg_pm25,
  MAX(pm25) AS max_pm25,
  MIN(pm25) AS min_pm25
FROM sensor_readings
WHERE 
  sensor_id = $1
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY hour, sensor_id
ORDER BY hour DESC;
`;

/**
 * Redis cache key patterns
 */
export const REDIS_KEYS = {
  SENSOR_LATEST: (sensorId: string) => `sensor:latest:${sensorId}`,
  SENSORS_MONVALLEY: 'sensors:monvalley',
  WIND_LATEST: (lat: number, lng: number) => `wind:latest:${lat}:${lng}`,
  RISK_LATEST: (lat: number, lng: number) => `risk:latest:${lat}:${lng}`,
  TRI_FACILITIES: 'tri:facilities',
  ECHO_COMPLIANCE: (facilityId: string) => `echo:compliance:${facilityId}`,
};

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  SENSOR_LATEST: 120, // 2 minutes
  SENSORS_MONVALLEY: 60, // 1 minute
  WIND_LATEST: 300, // 5 minutes
  RISK_LATEST: 180, // 3 minutes
  TRI_FACILITIES: 86400, // 24 hours
  ECHO_COMPLIANCE: 3600, // 1 hour
};

