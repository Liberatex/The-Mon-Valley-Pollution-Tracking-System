/**
 * Sensor Reliability Service
 * Tracks calibration status and calculates reliability weights
 */

export interface SensorReliability {
  sensorId: string;
  calibrationStatus: 'calibrated' | 'uncalibrated' | 'needs_calibration' | 'unknown';
  reliabilityFactor: number; // 0.5 - 1.0
  lastCalibrationDate?: Date;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  reasons: string[];
}

/**
 * Calculate reliability factor based on calibration status and data quality
 */
export function calculateReliabilityFactor(
  calibrationStatus: SensorReliability['calibrationStatus'],
  dataQuality: SensorReliability['dataQuality']
): number {
  let baseFactor = 1.0;

  // Calibration status impact
  switch (calibrationStatus) {
    case 'calibrated':
      baseFactor = 1.0;
      break;
    case 'needs_calibration':
      baseFactor = 0.8;
      break;
    case 'uncalibrated':
      baseFactor = 0.6;
      break;
    case 'unknown':
      baseFactor = 0.7;
      break;
  }

  // Data quality impact
  switch (dataQuality) {
    case 'excellent':
      // No reduction
      break;
    case 'good':
      baseFactor *= 0.95;
      break;
    case 'fair':
      baseFactor *= 0.85;
      break;
    case 'poor':
      baseFactor *= 0.65;
      break;
  }

  // Ensure minimum of 0.5
  return Math.max(0.5, baseFactor);
}

/**
 * Assess sensor data quality based on readings
 */
export function assessDataQuality(
  pm25: number,
  humidity?: number,
  temperature?: number,
  lastSeen?: Date
): SensorReliability['dataQuality'] {
  const reasons: string[] = [];

  // Check for invalid readings
  if (pm25 < 0 || pm25 > 1000) {
    reasons.push('Invalid PM2.5 reading');
    return 'poor';
  }

  // Check for stale data (more than 24 hours old)
  if (lastSeen) {
    const hoursSinceUpdate = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate > 24) {
      reasons.push('Stale data (>24 hours old)');
      return 'poor';
    } else if (hoursSinceUpdate > 12) {
      reasons.push('Data older than 12 hours');
      return 'fair';
    }
  }

  // Check temperature sanity
  if (temperature !== undefined && (temperature < -40 || temperature > 60)) {
    reasons.push('Invalid temperature reading');
    return 'poor';
  }

  // Check humidity sanity
  if (humidity !== undefined && (humidity < 0 || humidity > 100)) {
    reasons.push('Invalid humidity reading');
    return 'fair';
  }

  // If no issues, quality is good or excellent
  if (reasons.length === 0) {
    return 'excellent';
  } else if (reasons.length === 1) {
    return 'good';
  } else {
    return 'fair';
  }
}

/**
 * Calculate weighted average of sensor readings based on reliability
 */
export function calculateWeightedAverage(
  readings: Array<{ sensorId: string; pm25: number; reliability: number }>
): number {
  if (readings.length === 0) {
    return 0;
  }

  let totalWeightedValue = 0;
  let totalWeight = 0;

  readings.forEach((reading) => {
    const weight = reading.reliability;
    totalWeightedValue += reading.pm25 * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? totalWeightedValue / totalWeight : 0;
}

/**
 * Get sensor reliability for a sensor
 */
export function getSensorReliability(
  sensorId: string,
  calibrationStatus: SensorReliability['calibrationStatus'],
  pm25: number,
  humidity?: number,
  temperature?: number,
  lastSeen?: Date
): SensorReliability {
  const dataQuality = assessDataQuality(pm25, humidity, temperature, lastSeen);
  const reliabilityFactor = calculateReliabilityFactor(calibrationStatus, dataQuality);

  return {
    sensorId,
    calibrationStatus,
    reliabilityFactor,
    dataQuality,
    reasons: [],
  };
}

