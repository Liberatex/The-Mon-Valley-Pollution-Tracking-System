/**
 * Weighted Risk Algorithm
 * Core innovation: Multi-factor risk calculation that goes beyond standard AQI
 * Formula: Risk Index = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user
 */

export interface RiskCalculationInputs {
  pm25Calibrated: number; // PM_cal: Barkjohn-corrected PM2.5 (μg/m³)
  toxicityWeight: number; // W_tox: Toxicity factor (1.0 - 2.0)
  dispersionFactor: number; // W_wind: Wind dispersion factor (0.8 - 1.5)
  odorScore: number; // Odor_score: Normalized Smell PGH reports (0-100)
  odorWeight: number; // W_odor: Gas proxy weight (allows odor to override PM)
  vulnerabilityScore: number; // V_user: Personal health multiplier (1.0 - 2.0)
}

export interface RiskResult {
  riskIndex: number; // Final calculated risk score
  riskLevel: 'low' | 'elevated' | 'high' | 'severe' | 'toxic';
  riskColor: 'green' | 'yellow' | 'orange' | 'red' | 'purple';
  recommendation: string;
  confidence: 'low' | 'medium' | 'high';
  components: {
    pmComponent: number;
    odorComponent: number;
    environmentalScore: number;
    finalScore: number;
  };
}

/**
 * Calculate Weighted Risk Index
 * @param inputs Risk calculation inputs
 * @returns Risk result with level, color, and recommendation
 */
export function calculateWeightedRisk(
  inputs: RiskCalculationInputs
): RiskResult {
  // PM component: (PM_cal × W_tox × W_wind)
  const pmComponent = inputs.pm25Calibrated * inputs.toxicityWeight * inputs.dispersionFactor;

  // Odor component: (Odor_score × W_odor)
  const odorComponent = inputs.odorScore * inputs.odorWeight;

  // Environmental score (before vulnerability multiplier)
  const environmentalScore = pmComponent + odorComponent;

  // Apply vulnerability multiplier: × V_user
  const finalScore = environmentalScore * inputs.vulnerabilityScore;

  // Determine risk level and color
  let riskLevel: RiskResult['riskLevel'];
  let riskColor: RiskResult['riskColor'];
  let recommendation: string;

  if (finalScore < 25) {
    riskLevel = 'low';
    riskColor = 'green';
    recommendation = 'Air quality is safe for all. Enjoy the outdoors.';
  } else if (finalScore < 50) {
    riskLevel = 'elevated';
    riskColor = 'yellow';
    recommendation = 'Air quality is acceptable for the general public. Sensitive individuals should have medications ready.';
  } else if (finalScore < 75) {
    riskLevel = 'high';
    riskColor = 'orange';
    recommendation = 'Sensitive individuals should shelter in place. General public should limit outdoor exertion.';
  } else if (finalScore < 100) {
    riskLevel = 'severe';
    riskColor = 'red';
    recommendation = 'All users should shelter in place. Check window seals and activate air purifiers.';
  } else {
    riskLevel = 'toxic';
    riskColor = 'purple';
    recommendation = 'IMMEDIATE ALERT: Likely industrial upset event. Consult Compliance Card for facility details. Consider evacuating if symptoms worsen.';
  }

  // Calculate confidence based on data quality
  let confidence: RiskResult['confidence'] = 'medium';
  if (inputs.pm25Calibrated > 0 && inputs.odorScore > 0) {
    confidence = 'high'; // Both PM and odor data available
  } else if (inputs.pm25Calibrated === 0 && inputs.odorScore === 0) {
    confidence = 'low'; // No data
  }

  return {
    riskIndex: finalScore,
    riskLevel,
    riskColor,
    recommendation,
    confidence,
    components: {
      pmComponent,
      odorComponent,
      environmentalScore,
      finalScore,
    },
  };
}

/**
 * Calculate vulnerability score (V_user) based on health factors
 * @param hasAsthma Has asthma diagnosis
 * @param hasCOPD Has COPD diagnosis
 * @param ageGroup Age group: 'child' | 'adult' | 'senior'
 * @param previousHighExposure Has history of high exposure events
 * @returns Vulnerability score (1.0 - 2.0)
 */
export function calculateVulnerabilityScore(
  hasAsthma: boolean = false,
  hasCOPD: boolean = false,
  ageGroup: 'child' | 'adult' | 'senior' = 'adult',
  previousHighExposure: boolean = false
): number {
  let vScore = 1.0; // Base

  if (hasAsthma) {
    vScore += 0.5;
  }

  if (hasCOPD) {
    vScore += 0.5;
  }

  if (ageGroup === 'senior') {
    vScore += 0.3;
  } else if (ageGroup === 'child') {
    vScore += 0.2; // Children are also vulnerable
  }

  if (previousHighExposure) {
    vScore += 0.2;
  }

  // Cap at 2.0
  return Math.min(2.0, vScore);
}

/**
 * Normalize odor reports to 0-100 scale
 * @param smellReports Array of smell report values (1-5 scale)
 * @param clusterSize Number of reports in cluster
 * @returns Normalized odor score (0-100)
 */
export function normalizeOdorScore(
  smellReports: number[],
  clusterSize: number
): number {
  if (smellReports.length === 0) {
    return 0;
  }

  // Average smell value (1-5 scale)
  const avgSmell = smellReports.reduce((sum, val) => sum + val, 0) / smellReports.length;

  // Weight by cluster size (more reports = higher confidence)
  const clusterWeight = Math.min(1.0, clusterSize / 10); // Max weight at 10+ reports

  // Normalize to 0-100 scale
  const normalized = (avgSmell / 5) * 100 * clusterWeight;

  return Math.min(100, normalized);
}

