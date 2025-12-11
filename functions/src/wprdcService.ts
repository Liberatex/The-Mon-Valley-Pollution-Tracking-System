// WPRDC (Western PA Regional Data Center) Service
// ACHD air quality data via CKAN DataStore API
// https://data.wprdc.org/dataset/allegheny-county-air-quality

import axios from 'axios';

interface WPRDCReading {
  _id: number;
  datetime_est: string;
  site: string;
  parameter: string;
  is_valid: boolean;
  report_value: string;
  unit: string;
  unit_description: string;
  aqs_parameter_category: string;
}

interface WPRDCResponse {
  success: boolean;
  result: {
    records: WPRDCReading[];
    fields: any[];
  };
}

interface ProcessedReading {
  pm25?: number;
  so2?: number;
  ozone?: number;
  timestamp: string;
  location: string;
  source: string;
  aqi?: number;
}

/**
 * Fetch latest ACHD air quality data from WPRDC
 * This is the ACTUAL official ACHD data we need!
 */
export async function fetchACHDWPRDC(): Promise<{
  success: boolean;
  data: ProcessedReading[];
  source: string;
  lastUpdated: string;
}> {
  try {
    console.log('Fetching latest ACHD data from WPRDC...');
    
    // WPRDC CKAN API endpoint - no API key needed!
    const baseUrl = 'https://data.wprdc.org/api/3/action/datastore_search';
    const resourceId = '36fb4629-8003-4acc-a1ca-3302778a530d';
    
    // Map site names to coordinates
    const siteCoords: Record<string, { lat: number; lng: number }> = {
      'Liberty': { lat: 40.291, lng: -79.886 },
      'Lawrenceville': { lat: 40.467, lng: -79.958 },
      'Lincoln': { lat: 40.265, lng: -79.932 },
      'North Braddock': { lat: 40.400, lng: -79.863 },
      'Clairton': { lat: 40.292, lng: -79.881 }
    };
    
    // Get latest PM2.5 readings from all sites
    const pm25Readings = await axios.get(`${baseUrl}`, {
      params: {
        resource_id: resourceId,
        filters: JSON.stringify({
          parameter: 'PM25',
          is_valid: true
        }),
        limit: 50, // Get more readings to find valid ones across multiple sites
        sort: 'datetime_est desc'
      },
      timeout: 15000
    });
    
    const data = pm25Readings.data as any;
    
    if (!data.success || !data.result?.records || data.result.records.length === 0) {
      console.log('No recent PM2.5 data found in WPRDC');
      return {
        success: false,
        data: [],
        source: 'WPRDC CKAN DataStore',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Process all valid readings - get unique sites with their latest readings
    const siteMap = new Map<string, { pm25: number; timestamp: string; coords: { lat: number; lng: number } }>();
    
    for (const record of data.result.records) {
      const pm25Value = parseFloat(record.report_value);
      if (!isNaN(pm25Value) && pm25Value >= 0) {
        // Only keep the most recent reading per site
        const existing = siteMap.get(record.site);
        if (!existing || new Date(record.datetime_est) > new Date(existing.timestamp)) {
          siteMap.set(record.site, {
            pm25: Math.max(pm25Value, 0.1), // Use 0.1 minimum to ensure visibility
            timestamp: record.datetime_est,
            coords: siteCoords[record.site] || { lat: 40.292, lng: -79.881 }
          });
        }
      }
    }
    
    if (siteMap.size === 0) {
      console.log('No valid PM25 readings found after processing');
      return {
        success: false,
        data: [],
        source: 'WPRDC CKAN DataStore',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Convert to array format with coordinates
    const processedReadings = Array.from(siteMap.entries()).map(([site, data]) => ({
      pm25: data.pm25,
      timestamp: data.timestamp,
      location: site,
      source: 'Official ACHD Data (WPRDC)',
      aqi: calculateAQI(data.pm25),
      coordinates: data.coords
    }));
    
    console.log(`✅ WPRDC: Found ${processedReadings.length} unique monitoring sites`);
    
    return {
      success: true,
      data: processedReadings,
      source: 'WPRDC CKAN DataStore',
      lastUpdated: new Date().toISOString()
    };
    
    // Legacy code below removed - unreachable after return statement above
    
  } catch (error: any) {
    console.error('Error fetching WPRDC data:', error.message);
    
    // Return error - no fallback data
    return {
      success: false,
      data: [],
      source: 'WPRDC CKAN DataStore (Official ACHD)',
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Calculate AQI from PM2.5 (EPA standard)
 */
function calculateAQI(pm25: number): number {
  if (pm25 <= 12) return Math.round((pm25 / 12) * 50);
  if (pm25 <= 35.4) return Math.round((((pm25 - 12) / (35.4 - 12)) * 49) + 51);
  if (pm25 <= 55.4) return Math.round((((pm25 - 35.4) / (55.4 - 35.4)) * 49) + 101);
  if (pm25 <= 150.4) return Math.round((((pm25 - 55.4) / (150.4 - 55.4)) * 99) + 151);
  return Math.round((((pm25 - 150.4) / (250.4 - 150.4)) * 99) + 201);
}

/**
 * Get all monitoring sites from WPRDC for map display
 */
export async function getAllACHDSites(): Promise<Array<{
  name: string;
  location: { lat: number; lng: number };
  latestReading: { pm25: number; timestamp: string } | null;
}>> {
  try {
    const baseUrl = 'https://data.wprdc.org/api/3/action/datastore_search';
    const resourceId = '36fb4629-8003-4acc-a1ca-3302778a530d';
    
    // Get all sites
    const sitesResp = await axios.get(`${baseUrl}`, {
      params: {
        resource_id: resourceId,
        filters: JSON.stringify({
          parameter: 'PM25'
        }),
        limit: 1000, // Get more data to find unique sites
        sort: 'datetime_est desc'
      },
      timeout: 15000
    });
    
    const data = sitesResp.data as any;
    
    if (!data.success || !data.result?.records || data.result.records.length === 0) {
      return [];
    }
    
    // Get unique sites with their latest readings
    const siteMap = new Map<string, { pm25: number; timestamp: string }>();
    
    for (const record of data.result.records) {
      if (!siteMap.has(record.site)) {
        siteMap.set(record.site, {
          pm25: parseFloat(record.report_value),
          timestamp: record.datetime_est
        });
      }
    }
    
    // Map site names to coordinates
    const siteCoords: Record<string, { lat: number; lng: number }> = {
      'Liberty': { lat: 40.291, lng: -79.886 },
      'Lawrenceville': { lat: 40.467, lng: -79.958 },
      'Lincoln': { lat: 40.265, lng: -79.932 },
      'North Braddock': { lat: 40.400, lng: -79.863 },
      'Clairton': { lat: 40.292, lng: -79.881 }
    };
    
    // Return sites with coordinates and latest readings
    return Array.from(siteMap.entries()).map(([name, reading]) => ({
      name,
      location: siteCoords[name] || { lat: 0, lng: 0 },
      latestReading: reading
    }));
    
  } catch (error: any) {
    console.error('Error fetching ACHD sites:', error.message);
    return [];
  }
}

