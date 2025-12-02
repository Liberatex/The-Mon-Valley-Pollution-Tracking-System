/**
 * Chemical Speciation Service
 * Tracks specific chemicals (H2S, Benzene, VOCs, SO2) and their risks
 */

export interface ChemicalReading {
  chemical: 'H2S' | 'Benzene' | 'SO2' | 'VOC' | 'PM2.5';
  concentration: number;
  unit: string;
  source: 'sensor' | 'smell_pgh' | 'epa_tri' | 'modeled';
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
  };
}

export interface ChemicalRisk {
  chemical: string;
  concentration: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  healthEffects: string[];
  sensitiveGroups: string[];
  recommendation: string;
}

/**
 * PA state standard for H2S: 0.005 ppm
 */
const H2S_STANDARD = 0.005; // ppm

/**
 * Assess H2S risk (using Smell PGH as proxy)
 */
export function assessH2SRisk(
  smellReports: Array<{ smellValue: number; lat: number; lng: number }>,
  location: { lat: number; lng: number }
): ChemicalRisk {
  // Find nearby smell reports
  const nearbyReports = smellReports.filter((report) => {
    const distance = Math.sqrt(
      Math.pow(report.lat - location.lat, 2) +
        Math.pow(report.lng - location.lng, 2)
    );
    return distance < 0.02; // ~2km
  });

  if (nearbyReports.length === 0) {
    return {
      chemical: 'H2S',
      concentration: 0,
      riskLevel: 'low',
      healthEffects: [],
      sensitiveGroups: [],
      recommendation: 'No H2S indicators detected in your area.',
    };
  }

  const avgSmell =
    nearbyReports.reduce((sum, r) => sum + r.smellValue, 0) /
    nearbyReports.length;

  // Estimate H2S concentration from smell reports (proxy)
  // High smell (4-5) suggests H2S may exceed 0.005 ppm
  const estimatedH2S = (avgSmell / 5) * 0.01; // Rough estimate

  let riskLevel: ChemicalRisk['riskLevel'] = 'low';
  let healthEffects: string[] = [];
  let recommendation = '';

  if (estimatedH2S > H2S_STANDARD) {
    riskLevel = avgSmell >= 4.5 ? 'severe' : 'high';
    healthEffects = [
      'Eye irritation',
      'Respiratory irritation',
      'Headaches',
      'Nausea',
    ];
    recommendation =
      'Elevated H2S levels likely present (rotten egg odor). Close windows, use air purifier, and consider relocating if symptoms worsen.';
  } else if (avgSmell >= 3) {
    riskLevel = 'moderate';
    healthEffects = ['Mild eye irritation', 'Odor annoyance'];
    recommendation =
      'Moderate odor levels detected. Sensitive individuals should take precautions.';
  } else {
    recommendation = 'Low odor levels. Air quality appears acceptable.';
  }

  return {
    chemical: 'H2S',
    concentration: estimatedH2S,
    riskLevel,
    healthEffects,
    sensitiveGroups: ['Asthmatics', 'Children', 'Elderly', 'Pregnant women'],
    recommendation,
  };
}

/**
 * Assess Benzene risk (from EPA TRI data)
 */
export function assessBenzeneRisk(
  benzeneReleases: number, // pounds per year from TRI
  distance: number // miles from facility
): ChemicalRisk {
  // Benzene is a known carcinogen
  // Risk increases with proximity and release amount
  const proximityFactor = 1 / Math.max(0.1, distance); // Closer = higher risk
  const releaseFactor = benzeneReleases / 10000; // Normalize by 10k lbs/year
  const riskScore = proximityFactor * releaseFactor;

  let riskLevel: ChemicalRisk['riskLevel'] = 'low';
  let healthEffects: string[] = [];
  let recommendation = '';

  if (riskScore > 0.5) {
    riskLevel = 'severe';
    healthEffects = [
      'Increased cancer risk',
      'Blood disorders',
      'Immune system suppression',
    ];
    recommendation =
      'High benzene exposure risk. Limit outdoor exposure, especially during upwind conditions. Consider air purifier with activated carbon filter.';
  } else if (riskScore > 0.2) {
    riskLevel = 'high';
    healthEffects = ['Increased cancer risk', 'Blood disorders'];
    recommendation =
      'Elevated benzene exposure risk. Limit outdoor activities, especially for sensitive groups.';
  } else if (riskScore > 0.05) {
    riskLevel = 'moderate';
    healthEffects = ['Potential long-term health effects'];
    recommendation =
      'Moderate benzene exposure risk. Monitor air quality and limit prolonged outdoor exposure.';
  } else {
    recommendation = 'Low benzene exposure risk.';
  }

  return {
    chemical: 'Benzene',
    concentration: benzeneReleases,
    riskLevel,
    healthEffects,
    sensitiveGroups: [
      'Children',
      'Pregnant women',
      'People with blood disorders',
    ],
    recommendation,
  };
}

/**
 * Assess SO2 risk
 */
export function assessSO2Risk(so2Concentration: number): ChemicalRisk {
  // EPA 1-hour standard: 75 ppb
  // EPA 24-hour standard: 0.14 ppm
  const standard1hr = 75; // ppb
  const standard24hr = 0.14; // ppm

  let riskLevel: ChemicalRisk['riskLevel'] = 'low';
  let healthEffects: string[] = [];
  let recommendation = '';

  // Convert to ppb if needed (assuming input is in ppb)
  const so2ppb = so2Concentration;

  if (so2ppb > standard1hr) {
    riskLevel = 'severe';
    healthEffects = [
      'Respiratory irritation',
      'Asthma attacks',
      'Bronchoconstriction',
    ];
    recommendation =
      'SO2 levels exceed EPA standards. Sensitive individuals should shelter in place. Close windows and use air purifier.';
  } else if (so2ppb > standard1hr * 0.7) {
    riskLevel = 'high';
    healthEffects = ['Respiratory irritation', 'Asthma attacks'];
    recommendation =
      'Elevated SO2 levels. Sensitive individuals should limit outdoor exposure.';
  } else if (so2ppb > standard1hr * 0.5) {
    riskLevel = 'moderate';
    healthEffects = ['Mild respiratory irritation'];
    recommendation =
      'Moderate SO2 levels. Sensitive individuals should monitor symptoms.';
  } else {
    recommendation = 'SO2 levels within acceptable range.';
  }

  return {
    chemical: 'SO2',
    concentration: so2ppb,
    riskLevel,
    healthEffects,
    sensitiveGroups: ['Asthmatics', 'Children', 'Elderly', 'People with COPD'],
    recommendation,
  };
}

/**
 * Get combined chemical risk assessment
 */
export function getCombinedChemicalRisk(
  chemicals: ChemicalReading[]
): Array<ChemicalRisk> {
  const risks: ChemicalRisk[] = [];

  chemicals.forEach((chem) => {
    switch (chem.chemical) {
      case 'SO2':
        risks.push(assessSO2Risk(chem.concentration));
        break;
      case 'Benzene':
        // Would need distance to facility
        risks.push(
          assessBenzeneRisk(chem.concentration, 1.0) // Default 1 mile
        );
        break;
      // H2S handled separately via Smell PGH
      default:
        break;
    }
  });

  return risks;
}

