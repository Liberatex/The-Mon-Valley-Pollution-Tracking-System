/**
 * Barkjohn Calibration Algorithm
 * EPA-developed correction for PurpleAir sensors to account for humidity interference
 * Critical for accurate PM2.5 readings in humid environments like Mon Valley
 */

export interface CalibratedReading {
  rawPM: number;
  correctedPM: number;
  humidity: number;
  temperature: number;
  calibrationApplied: boolean;
}

/**
 * Apply Barkjohn calibration to PurpleAir PM2.5 reading
 * Formula: corrected_pm = 0.524 * raw_pm - 0.0862 * RH + 5.75
 * 
 * @param rawPM Raw PM2.5 reading from sensor
 * @param relativeHumidity Relative humidity percentage (0-100)
 * @param temperature Temperature in Celsius (for sanity checking)
 * @returns Calibrated reading with correction applied if needed
 */
export function applyBarkjohnCalibration(
  rawPM: number,
  relativeHumidity: number,
  temperature?: number
): CalibratedReading {
  // Sanity check: filter out invalid readings
  if (rawPM < 0 || rawPM > 1000) {
    return {
      rawPM,
      correctedPM: rawPM,
      humidity: relativeHumidity,
      temperature: temperature || 0,
      calibrationApplied: false,
    };
  }

  // Sanity check: temperature should be reasonable (-40°C to 60°C)
  if (temperature !== undefined && (temperature < -40 || temperature > 60)) {
    console.warn(`Invalid temperature reading: ${temperature}°C`);
    return {
      rawPM,
      correctedPM: rawPM,
      humidity: relativeHumidity,
      temperature,
      calibrationApplied: false,
    };
  }

  // Apply correction if humidity > 50% (mandatory) or if humidity > 30% (recommended)
  // The correction accounts for water vapor being misread as particles
  const shouldApplyCorrection = relativeHumidity > 30;

  if (shouldApplyCorrection) {
    // Barkjohn formula: corrected_pm = 0.524 * raw_pm - 0.0862 * RH + 5.75
    const correctedPM = 0.524 * rawPM - 0.0862 * relativeHumidity + 5.75;

    // Ensure corrected value is non-negative
    const finalPM = Math.max(0, correctedPM);

    return {
      rawPM,
      correctedPM: finalPM,
      humidity: relativeHumidity,
      temperature: temperature || 0,
      calibrationApplied: true,
    };
  }

  // Low humidity: use raw reading (correction not needed)
  return {
    rawPM,
    correctedPM: rawPM,
    humidity: relativeHumidity,
    temperature: temperature || 0,
    calibrationApplied: false,
  };
}

/**
 * Batch calibrate multiple sensor readings
 */
export function calibrateSensorReadings(
  readings: Array<{
    pm25: number;
    humidity?: number;
    temperature?: number;
  }>
): Array<CalibratedReading> {
  return readings.map((reading) =>
    applyBarkjohnCalibration(
      reading.pm25,
      reading.humidity || 50, // Default to 50% if not provided
      reading.temperature
    )
  );
}

