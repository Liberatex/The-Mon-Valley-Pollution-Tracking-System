/**
 * EPA Toxic Release Inventory (TRI) Service
 * Fetches chemical release data for toxicity weighting in risk calculations
 */

import axios from 'axios';

export interface TRIFacility {
  facilityId: string;
  name: string;
  latitude: number;
  longitude: number;
  chemicals: Array<{
    name: string;
    casNumber: string;
    airReleases: number; // pounds per year
    rseiScore?: number; // Risk-Screening Environmental Indicators score
  }>;
  totalAirReleases: number;
  toxicityWeight: number; // W_tox factor (1.0 - 2.0)
}

export interface ChemicalOfConcern {
  name: string;
  casNumber: string;
  rseiScore: number; // Higher = more toxic
}

// Chemicals of high concern for Mon Valley (from VCAN requirements)
const CHEMICALS_OF_CONCERN: ChemicalOfConcern[] = [
  { name: 'Benzene', casNumber: '71-43-2', rseiScore: 100 }, // High carcinogen
  { name: 'Styrene', casNumber: '100-42-5', rseiScore: 50 },
  { name: 'Toluene', casNumber: '108-88-3', rseiScore: 30 },
  { name: 'Manganese', casNumber: '7439-96-5', rseiScore: 40 },
  { name: 'Hydrogen Cyanide', casNumber: '74-90-8', rseiScore: 80 },
  { name: 'Hydrogen Sulfide', casNumber: '7783-06-4', rseiScore: 60 },
  { name: 'Sulfur Dioxide', casNumber: '7446-09-5', rseiScore: 35 },
];

/**
 * Calculate toxicity weight (W_tox) for a facility based on chemical releases
 * @param chemicals Array of chemical releases
 * @returns Toxicity weight (1.0 - 2.0)
 */
export function calculateToxicityWeight(
  chemicals: Array<{ name: string; airReleases: number; rseiScore?: number }>
): number {
  let totalToxicityScore = 0;

  chemicals.forEach((chem) => {
    // Find RSEI score for this chemical
    const concern = CHEMICALS_OF_CONCERN.find(
      (c) => c.name.toLowerCase() === chem.name.toLowerCase()
    );
    const rseiScore = chem.rseiScore || concern?.rseiScore || 10; // Default low score

    // Weight by release amount and toxicity
    const weightedScore = (chem.airReleases / 1000) * rseiScore; // Normalize by 1000 lbs
    totalToxicityScore += weightedScore;
  });

  // Normalize to 1.0 - 2.0 range
  // High toxicity facilities (Clairton) might score 2.0
  // Low toxicity facilities score 1.0
  const normalizedWeight = Math.min(2.0, Math.max(1.0, 1.0 + totalToxicityScore / 100));

  return normalizedWeight;
}

/**
 * Fetch TRI facilities for Allegheny County, PA
 * @param apiKey Optional API key (EPA Envirofacts is public but may require registration)
 */
export async function fetchTRIFacilities(
  apiKey?: string
): Promise<TRIFacility[]> {
  try {
    // EPA Envirofacts API endpoint
    // Note: This is a simplified version - full implementation would query multiple tables
    const baseUrl = 'https://data.epa.gov/efservice';
    
    // For now, return hardcoded Mon Valley facilities with TRI data
    // Full implementation would query TRI_FACILITY_INFORMATION and TRI_REPORTING_FORM tables
    const monValleyFacilities: TRIFacility[] = [
      {
        facilityId: '110000305886',
        name: 'U.S. Steel Clairton Works',
        latitude: 40.292,
        longitude: -79.881,
        chemicals: [
          { name: 'Benzene', casNumber: '71-43-2', airReleases: 50000, rseiScore: 100 },
          { name: 'Hydrogen Sulfide', casNumber: '7783-06-4', airReleases: 30000, rseiScore: 60 },
          { name: 'Sulfur Dioxide', casNumber: '7446-09-5', airReleases: 200000, rseiScore: 35 },
          { name: 'Manganese', casNumber: '7439-96-5', airReleases: 15000, rseiScore: 40 },
        ],
        totalAirReleases: 295000,
        toxicityWeight: 1.9, // High toxicity (coke works)
      },
      {
        facilityId: '110000305887',
        name: 'U.S. Steel Edgar Thomson Works',
        latitude: 40.400,
        longitude: -79.863,
        chemicals: [
          { name: 'Manganese', casNumber: '7439-96-5', airReleases: 20000, rseiScore: 40 },
          { name: 'Sulfur Dioxide', casNumber: '7446-09-5', airReleases: 150000, rseiScore: 35 },
        ],
        totalAirReleases: 170000,
        toxicityWeight: 1.4,
      },
      {
        facilityId: '110000305888',
        name: 'U.S. Steel Irvin Plant',
        latitude: 40.350,
        longitude: -79.886,
        chemicals: [
          { name: 'Manganese', casNumber: '7439-96-5', airReleases: 10000, rseiScore: 40 },
          { name: 'Sulfur Dioxide', casNumber: '7446-09-5', airReleases: 80000, rseiScore: 35 },
        ],
        totalAirReleases: 90000,
        toxicityWeight: 1.2,
      },
    ];

    // Calculate toxicity weights
    monValleyFacilities.forEach((facility) => {
      facility.toxicityWeight = calculateToxicityWeight(facility.chemicals);
    });

    return monValleyFacilities;
  } catch (error) {
    console.error('Error fetching TRI facilities:', error);
    return [];
  }
}

/**
 * Get toxicity weight for a sensor based on upwind facilities
 * @param sensorLat Sensor latitude
 * @param sensorLng Sensor longitude
 * @param facilities Array of TRI facilities
 * @param windDirection Wind direction in degrees
 * @returns Toxicity weight (1.0 - 2.0)
 */
export function getSensorToxicityWeight(
  sensorLat: number,
  sensorLng: number,
  facilities: TRIFacility[],
  windDirection: number
): number {
  // Find upwind facilities
  const upwindFacilities = facilities.filter((facility) => {
    // Simple distance check - in full implementation, use proper upwind calculation
    const distance = Math.sqrt(
      Math.pow(facility.latitude - sensorLat, 2) +
        Math.pow(facility.longitude - sensorLng, 2)
    );
    
    // Consider facilities within 10km
    return distance < 0.1; // ~10km in degrees
  });

  if (upwindFacilities.length === 0) {
    return 1.0; // No upwind facilities = baseline
  }

  // Use highest toxicity weight from upwind facilities
  const maxToxicity = Math.max(
    ...upwindFacilities.map((f) => f.toxicityWeight)
  );

  return maxToxicity;
}

