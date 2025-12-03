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
    
    // Get latest Liberty PM2.5 reading - ONLY valid readings
    const libertyPM25 = await axios.get(`${baseUrl}`, {
      params: {
        resource_id: resourceId,
        filters: JSON.stringify({
          site: 'Liberty',
          parameter: 'PM25',
          is_valid: true
        }),
        limit: 1,
        sort: 'datetime_est desc'
      },
      timeout: 10000
    });
    
    const data = libertyPM25.data as any;
    
    if (!data.success || !data.result?.records || data.result.records.length === 0) {
      console.log('No recent Liberty PM2.5 data found');
      
      // Try to get ANY recent VALID PM25 data
      const anyPM25 = await axios.get(`${baseUrl}`, {
        params: {
          resource_id: resourceId,
          filters: JSON.stringify({
            parameter: 'PM25',
            is_valid: true
          }),
          limit: 10,
          sort: 'datetime_est desc'
        },
        timeout: 10000
      });
      
      const anyData = anyPM25.data as any;
      
      if (!anyData.success || !anyData.result?.records || anyData.result.records.length === 0) {
        throw new Error('No PM25 data available');
      }
      
      const reading = anyData.result.records[0];
      const pm25Value = parseFloat(reading.report_value);
      
      return {
        success: true,
        data: [{
          pm25: pm25Value,
          timestamp: reading.datetime_est,
          location: reading.site,
          source: 'Official ACHD Data (WPRDC)',
          aqi: calculateAQI(pm25Value)
        }],
        source: 'WPRDC CKAN DataStore',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // We have Liberty data - get related readings
    const latestReading = data.result.records[0];
    console.log('Latest Liberty reading:', latestReading);
    
    // Only parse if report_value exists and is not null
    if (!latestReading.report_value || latestReading.report_value === 'null' || latestReading.report_value.trim() === '') {
      console.log('Invalid report_value:', latestReading.report_value);
      throw new Error('Invalid PM25 reading');
    }
    
    const pm25Value = parseFloat(latestReading.report_value);
    console.log('Parsed PM25 value:', pm25Value);
    
    if (isNaN(pm25Value)) {
      console.log('PM25 value is NaN');
      throw new Error('PM25 value is NaN');
    }
    
    const timestamp = latestReading.datetime_est;
    
    // Get SO2 and Ozone for same time period
    let so2Value: number | undefined;
    let ozoneValue: number | undefined;
    
    try {
      const so2Resp = await axios.get(`${baseUrl}`, {
        params: {
          resource_id: resourceId,
          filters: JSON.stringify({
            site: 'Liberty',
            parameter: 'SO2',
            datetime_est: timestamp
          }),
          limit: 1
        },
        timeout: 5000
      });
      
      const so2Data = so2Resp.data as any;
      if (so2Data.success && so2Data.result?.records && so2Data.result.records.length > 0) {
        so2Value = parseFloat(so2Data.result.records[0].report_value);
      }
    } catch (err) {
      // SO2 not critical
    }
    
    try {
      const ozoneResp = await axios.get(`${baseUrl}`, {
        params: {
          resource_id: resourceId,
          filters: JSON.stringify({
            site: 'Liberty',
            parameter: 'OZONE',
            datetime_est: timestamp
          }),
          limit: 1
        },
        timeout: 5000
      });
      
      const ozoneData = ozoneResp.data as any;
      if (ozoneData.success && ozoneData.result?.records && ozoneData.result.records.length > 0) {
        ozoneValue = parseFloat(ozoneData.result.records[0].report_value);
      }
    } catch (err) {
      // Ozone not critical
    }
    
    console.log('✅ Got ACHD data from WPRDC:', {
      pm25: pm25Value,
      timestamp,
      site: 'Liberty'
    });
    
    return {
      success: true,
      data: [{
        pm25: pm25Value,
        so2: so2Value,
        ozone: ozoneValue,
        timestamp,
        location: 'Liberty - Mon Valley (Official ACHD)',
        source: 'Official ACHD Data (WPRDC)',
        aqi: calculateAQI(pm25Value)
      }],
      source: 'WPRDC CKAN DataStore (Official ACHD)',
      lastUpdated: new Date().toISOString()
    };
    
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

