/**
 * Smell PGH Service
 * Integrates with CMU Create Lab's Smell PGH for crowdsourced odor reports
 * Used as proxy for H2S and SO2 detection
 * API Documentation: https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API
 */

import axios from 'axios';
import { shouldUseEmulator } from '../utils/env';

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
  maxDistance: number = 0.015, // ~1.5km in degrees (increased to capture more clusters)
  minReports: number = 2 // Lowered from 3 to 2 to show more clusters
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
 * Fetch Smell PGH reports from backend Cloud Function
 * API Documentation: https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API
 * @param boundingBox Bounding box for Mon Valley area
 * @param days Number of days to look back (default: 7)
 * @param minSmellValue Minimum smell value to include (1-5, default: 3)
 */
export async function fetchSmellPGHReports(
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  days: number = 7,
  minSmellValue: number = 3
): Promise<SmellReport[]> {
  try {
    // Determine base URL (emulator vs production)
    const isDevelopment = shouldUseEmulator();
    
    const baseUrl = isDevelopment
      ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
      : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';

    // Build query parameters according to Smell PGH API documentation
    // Documentation: https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/How-to-use-the-API
    const params: any = {
      smell_value: `${minSmellValue},4,5`, // Include specified value and above (comma-separated)
      region_ids: '1', // Allegheny County (region 1)
    };

    // Add time range (Unix timestamps)
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (days * 24 * 60 * 60);
    params.start_time = startTime;
    params.end_time = now;

    // Note: Smell PGH API doesn't support bounding box parameters directly
    // We'll filter by bounding box after receiving the data
    // If bounding box is provided, we'll pass it for backend filtering
    if (boundingBox) {
      params.north = boundingBox.north;
      params.south = boundingBox.south;
      params.east = boundingBox.east;
      params.west = boundingBox.west;
    }

    // Call backend Cloud Function
    const response = await axios.get(`${baseUrl}/fetchSmellPGHReports`, {
      params,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data?.success && response.data.reports) {
      // Map backend response to our format
      const mappedReports = response.data.reports
        .filter((report: any) => report.latitude && report.longitude) // Filter out invalid reports
        .map((report: any) => ({
          id: report.id || `smell-${report.zipCode}-${report.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          smellValue: report.smellValue,
          zipCode: report.zipCode || '',
          latitude: parseFloat(report.latitude),
          longitude: parseFloat(report.longitude),
          timestamp: report.timestamp instanceof Date ? report.timestamp : new Date(report.timestamp),
          symptoms: report.feelingsSymptoms ? 
            (Array.isArray(report.feelingsSymptoms) ? report.feelingsSymptoms : [report.feelingsSymptoms]) : 
            [],
        }));
      
      console.log(`✅ Mapped ${mappedReports.length} Smell PGH reports from backend`);
      return mappedReports;
    }

    console.warn('⚠️ No reports in response:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching Smell PGH reports:', error);
    // Return empty array on error (graceful degradation)
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

