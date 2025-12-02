/**
 * Mon Valley Topological Context Service
 * Handles elevation data, thermal inversion modeling, and valley-specific dispersion
 */

export interface ElevationData {
  lat: number;
  lng: number;
  elevation: number; // meters above sea level
}

export interface ThermalInversion {
  isActive: boolean;
  strength: 'weak' | 'moderate' | 'strong';
  baseHeight: number; // meters
  topHeight: number; // meters
  timestamp: Date;
}

export interface ValleyDispersion {
  dispersionFactor: number; // Modified by topography
  windChanneling: number; // 0-1, how much wind is channeled by valley
  stagnationRisk: number; // 0-1, risk of pollution stagnation
}

/**
 * Mon Valley elevation data (simplified)
 * Full implementation would use USGS elevation API or DEM data
 */
const MON_VALLEY_ELEVATIONS: Record<string, number> = {
  'clairton': 240, // meters
  'braddock': 250,
  'west_mifflin': 280,
  'glassport': 230,
  'liberty': 235,
};

/**
 * Get elevation for a location
 */
export function getElevation(lat: number, lng: number): number {
  // Simplified - full implementation would query elevation API
  // For Mon Valley, elevations range from ~230-280m
  const baseElevation = 240; // Default
  
  // Simple approximation based on distance from river
  // Closer to river = lower elevation
  const riverLat = 40.292;
  const riverLng = -79.881;
  const distance = Math.sqrt(
    Math.pow(lat - riverLat, 2) + Math.pow(lng - riverLng, 2)
  );
  
  // Elevation increases with distance from river
  return baseElevation + distance * 1000; // Rough approximation
}

/**
 * Detect thermal inversion conditions
 * Thermal inversions trap pollution in the valley
 */
export function detectThermalInversion(
  temperature: number,
  windSpeed: number,
  elevation: number
): ThermalInversion {
  // Thermal inversions occur when:
  // 1. Low wind speed (< 2 m/s)
  // 2. Clear skies (no cloud cover - simplified)
  // 3. Valley topography traps cold air

  const isActive = windSpeed < 2 && elevation < 300;

  if (!isActive) {
    return {
      isActive: false,
      strength: 'weak',
      baseHeight: 0,
      topHeight: 0,
      timestamp: new Date(),
    };
  }

  // Estimate inversion strength
  let strength: ThermalInversion['strength'] = 'weak';
  if (windSpeed < 0.5) {
    strength = 'strong';
  } else if (windSpeed < 1.0) {
    strength = 'moderate';
  }

  // Estimate inversion layer height
  // Strong inversions: 50-200m above valley floor
  // Moderate: 200-500m
  // Weak: 500-1000m
  const baseHeight = elevation;
  let topHeight = baseHeight;
  switch (strength) {
    case 'strong':
      topHeight = baseHeight + 150;
      break;
    case 'moderate':
      topHeight = baseHeight + 350;
      break;
    case 'weak':
      topHeight = baseHeight + 750;
      break;
  }

  return {
    isActive: true,
    strength,
    baseHeight,
    topHeight,
    timestamp: new Date(),
  };
}

/**
 * Calculate valley-specific dispersion factor
 * Accounts for topography, thermal inversions, and wind channeling
 */
export function calculateValleyDispersion(
  windSpeed: number,
  windDirection: number,
  elevation: number,
  thermalInversion?: ThermalInversion
): ValleyDispersion {
  // Base dispersion factor
  let dispersionFactor = 1.0;

  // Thermal inversion reduces dispersion
  if (thermalInversion?.isActive) {
    switch (thermalInversion.strength) {
      case 'strong':
        dispersionFactor *= 0.3; // Severe reduction
        break;
      case 'moderate':
        dispersionFactor *= 0.6;
        break;
      case 'weak':
        dispersionFactor *= 0.8;
        break;
    }
  }

  // Wind channeling in valley
  // Mon Valley runs roughly N-S, so N/S winds are channeled
  const isChanneled =
    (windDirection >= 0 && windDirection <= 45) || // N-NE
    (windDirection >= 315 && windDirection <= 360) || // N-NW
    (windDirection >= 135 && windDirection <= 225); // S

  const windChanneling = isChanneled ? 0.8 : 0.3; // Higher channeling = more trapped

  // Stagnation risk increases with:
  // - Low wind speed
  // - Thermal inversion
  // - Valley topography
  let stagnationRisk = 0;
  if (windSpeed < 1) {
    stagnationRisk += 0.5;
  }
  if (windSpeed < 2) {
    stagnationRisk += 0.3;
  }
  if (thermalInversion?.isActive) {
    stagnationRisk += 0.4;
  }
  if (elevation < 250) {
    stagnationRisk += 0.2; // Lower elevations more prone to stagnation
  }

  stagnationRisk = Math.min(1.0, stagnationRisk);

  return {
    dispersionFactor,
    windChanneling,
    stagnationRisk,
  };
}

/**
 * Adjust risk score for valley-specific conditions
 */
export function adjustRiskForTopography(
  baseRisk: number,
  valleyDispersion: ValleyDispersion
): number {
  // Higher stagnation risk = higher pollution risk
  const adjustment = 1.0 + valleyDispersion.stagnationRisk * 0.5;

  // Lower dispersion factor = higher risk
  const dispersionAdjustment = 1.0 / Math.max(0.1, valleyDispersion.dispersionFactor);

  return baseRisk * adjustment * dispersionAdjustment;
}

