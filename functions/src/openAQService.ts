// OpenAQ Service - Aggregates EPA/AirNow data
import axios from 'axios';

interface OpenAQDataPoint {
  pm25?: number;
  ozone?: number;
  so2?: number;
  timestamp: string;
  location: string;
  aqi?: number;
  source?: string;
}

export async function tryOpenAQ(): Promise<any> {
  try {
    console.log('Trying OpenAQ API for Allegheny County data...');
    
    // OpenAQ aggregates EPA AirNow data
    // Look for stations near Mon Valley (Liberty, Clairton area)
    const lat = 40.292;
    const lon = -79.881;
    const radius = 50000; // 50km radius
    
    const openAQUrl = `https://api.openaq.org/v3/latest?coordinates=${lat},${lon}&radius=${radius}&parameter_id=pm25&limit=10`;
    
    const response = await axios.get(openAQUrl, { timeout: 5000 });
    const data = response.data as any;
    
    if (data && data.results && data.results.length > 0) {
      // Find Liberty station or closest to Clairton
      let bestReading = data.results[0];
      
      for (const result of data.results) {
        if (result.locationName && 
            (result.locationName.toLowerCase().includes('liberty') || 
             result.locationName.toLowerCase().includes('clairton'))) {
          bestReading = result;
          break;
        }
      }
      
      const pm25Reading = bestReading.measurements.find((m: any) => m.parameter === 'pm25');
      
      if (pm25Reading) {
        return {
          success: true,
          data: [{
            pm25: pm25Reading.value,
            timestamp: pm25Reading.lastUpdated || new Date().toISOString(),
            location: bestReading.locationName || 'Allegheny County',
            source: `OpenAQ - ${bestReading.sources[0]?.name || 'EPA AirNow'}`,
            aqi: calculateAQI(pm25Reading.value)
          }],
          source: 'OpenAQ (EPA AirNow aggregates)',
          lastUpdated: new Date().toISOString()
        };
      }
    }
    
    // No good data found
    return {
      success: false,
      data: [],
      source: 'OpenAQ (EPA AirNow aggregates)',
      lastUpdated: new Date().toISOString(),
      message: 'No OpenAQ data available for Mon Valley area'
    };
    
  } catch (error: any) {
    console.error('OpenAQ error:', error.message);
    return {
      success: false,
      data: [],
      source: 'OpenAQ (EPA AirNow aggregates)',
      lastUpdated: new Date().toISOString(),
      error: error.message
    };
  }
}

function calculateAQI(pm25: number): number {
  if (pm25 <= 12) return Math.round((pm25 / 12) * 50);
  if (pm25 <= 35.4) return Math.round((((pm25 - 12) / (35.4 - 12)) * 49) + 51);
  if (pm25 <= 55.4) return Math.round((((pm25 - 35.4) / (55.4 - 35.4)) * 49) + 101);
  if (pm25 <= 150.4) return Math.round((((pm25 - 55.4) / (150.4 - 55.4)) * 99) + 151);
  return Math.round((((pm25 - 150.4) / (250.4 - 150.4)) * 99) + 201);
}

