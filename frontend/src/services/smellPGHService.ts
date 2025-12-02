/**
 * Smell PGH Service
 * Integrates with CMU Create Lab's Smell PGH for crowdsourced odor reports
 * Used as proxy for H2S and SO2 detection
 */

export interface SmellReport {
  id: string;
  smellValue: number; // 1-5 scale
  zipCode: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  symptoms?: string[]; // Tags like "headache", "nausea", etc.
}

export interface OdorCluster {
  center: { lat: number; lng: number };
  reports: SmellReport[];
  averageSmell: number;
  clusterSize: number;
  odorWeight: number; // W_odor factor
}

/**
 * Simple DBSCAN-like clustering for odor reports
 * Groups nearby reports into "Odor Events"
 * @param reports Array of smell reports
 * @param maxDistance Maximum distance in degrees for clustering (~1km)
 * @param minReports Minimum reports to form a cluster
 */
export function clusterOdorReports(
  reports: SmellReport[],
  maxDistance: number = 0.01, // ~1km in degrees
  minReports: number = 3
): OdorCluster[] {
  const clusters: OdorCluster[] = [];
  const processed = new Set<string>();

  reports.forEach((report) => {
    if (processed.has(report.id)) return;

    // Find nearby reports
    const nearby = reports.filter((r) => {
      if (processed.has(r.id)) return false;
      const distance = Math.sqrt(
        Math.pow(r.latitude - report.latitude, 2) +
          Math.pow(r.longitude - report.longitude, 2)
      );
      return distance <= maxDistance;
    });

    if (nearby.length >= minReports) {
      // Calculate cluster center
      const avgLat =
        nearby.reduce((sum, r) => sum + r.latitude, 0) / nearby.length;
      const avgLng =
        nearby.reduce((sum, r) => sum + r.longitude, 0) / nearby.length;

      // Calculate average smell value
      const avgSmell =
        nearby.reduce((sum, r) => sum + r.smellValue, 0) / nearby.length;

      // Mark as processed
      nearby.forEach((r) => processed.add(r.id));

      // Calculate odor weight (higher for more severe, larger clusters)
      const severityWeight = avgSmell / 5; // Normalize to 0-1
      const sizeWeight = Math.min(1.0, nearby.length / 10); // Max at 10+ reports
      const odorWeight = 1.0 + severityWeight * sizeWeight; // 1.0 - 2.0 range

      clusters.push({
        center: { lat: avgLat, lng: avgLng },
        reports: nearby,
        averageSmell: avgSmell,
        clusterSize: nearby.length,
        odorWeight,
      });
    }
  });

  return clusters;
}

/**
 * Fetch Smell PGH reports
 * Note: This requires API access from CMU Create Lab
 * For now, returns mock data structure
 * @param boundingBox Bounding box for Mon Valley area
 */
export async function fetchSmellPGHReports(boundingBox?: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<SmellReport[]> {
  try {
    // TODO: Replace with actual Smell PGH API endpoint
    // Expected endpoint: https://smellpgh.org/api/reports or similar
    // For now, return empty array - will be populated when API access is granted
    
    // Mock structure for development
    const mockReports: SmellReport[] = [
      // These would come from the actual API
    ];

    return mockReports;
  } catch (error) {
    console.error('Error fetching Smell PGH reports:', error);
    return [];
  }
}

/**
 * Calculate odor score for a location based on nearby clusters
 * @param lat Latitude
 * @param lng Longitude
 * @param clusters Array of odor clusters
 * @param maxDistance Maximum distance to consider (degrees)
 * @returns Normalized odor score (0-100)
 */
export function calculateLocationOdorScore(
  lat: number,
  lng: number,
  clusters: OdorCluster[],
  maxDistance: number = 0.02 // ~2km
): number {
  // Find nearby clusters
  const nearbyClusters = clusters.filter((cluster) => {
    const distance = Math.sqrt(
      Math.pow(cluster.center.lat - lat, 2) +
        Math.pow(cluster.center.lng - lng, 2)
    );
    return distance <= maxDistance;
  });

  if (nearbyClusters.length === 0) {
    return 0;
  }

  // Weight by distance and cluster severity
  let totalScore = 0;
  let totalWeight = 0;

  nearbyClusters.forEach((cluster) => {
    const distance = Math.sqrt(
      Math.pow(cluster.center.lat - lat, 2) +
        Math.pow(cluster.center.lng - lng, 2)
    );
    const distanceWeight = 1 - distance / maxDistance; // Closer = higher weight
    const clusterScore = (cluster.averageSmell / 5) * 100; // Normalize to 0-100

    totalScore += clusterScore * distanceWeight * cluster.clusterSize;
    totalWeight += distanceWeight * cluster.clusterSize;
  });

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

