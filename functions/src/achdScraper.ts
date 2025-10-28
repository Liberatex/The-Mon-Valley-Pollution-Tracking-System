// ACHD Hourly Data Scraper
// Scrapes the "Hourly Air Quality Data" page for current readings
// https://www.alleghenycounty.us/Services/Health-Department/Air-Quality/Monitored-Data

import axios from 'axios';
import * as cheerio from 'cheerio';

interface ACHDHourlyReading {
  datetime: string;
  pm25: number;
  ozone?: number;
  so2?: number;
  site: string;
}

/**
 * Fetch latest hourly data from ACHD's public data page
 * Returns an array of hourly readings for the past 24 hours
 */
export async function fetchACHDHourlyData(): Promise<{
  success: boolean;
  data: ACHDHourlyReading[];
  lastUpdated: string;
}> {
  try {
    console.log('Fetching ACHD hourly data from public page...');
    
    // ACHD's Hourly Air Quality Data page
    const url = 'https://www.alleghenycounty.us/Services/Health-Department/Air-Quality/Monitored-Data';
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonValleyPollutionTracker/1.0)'
      }
    });
    
    const $ = cheerio.load(response.data as string);
    
    // Look for Liberty monitoring station
    // The data is typically in a table or structured format
    const readings: ACHDHourlyReading[] = [];
    
    // Parse HTML structure - adjust selector based on actual page structure
    // Example: looking for tables with Liberty data
    $('table').each((i, table) => {
      const tableText = $(table).text();
      
      if (tableText.includes('Liberty')) {
        $(table).find('tr').each((j, row) => {
          const cells = $(row).find('td');
          
          if (cells.length > 0) {
            const rowText = $(row).text();
            
            // Extract PM2.5 value - adjust regex based on actual format
            const pm25Match = rowText.match(/PM2\.5[:\s]+(\d+\.?\d*)/i);
            
            if (pm25Match) {
              readings.push({
                datetime: new Date().toISOString(), // Adjust based on actual datetime in table
                pm25: parseFloat(pm25Match[1]),
                site: 'Liberty 2'
              });
            }
          }
        });
      }
    });
    
    if (readings.length > 0) {
      return {
        success: true,
        data: readings,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Fallback: Try alternative parsing method
    // Sometimes the data is in JavaScript variables or JSON
    const scriptTags = $('script').toArray();
    
    for (const script of scriptTags) {
      const scriptText = $(script).html() || '';
      
      // Look for JSON data in script tags
      const jsonMatch = scriptText.match(/data:\s*(\[.*?\])/s);
      
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          
          // Process JSON data
          for (const item of jsonData) {
            if (item.site && item.site.includes('Liberty')) {
              readings.push({
                datetime: item.datetime || new Date().toISOString(),
                pm25: item.pm25 || item['PM2.5'] || 0,
                ozone: item.ozone,
                so2: item.so2,
                site: item.site
              });
            }
          }
          
          if (readings.length > 0) {
            return {
              success: true,
              data: readings,
              lastUpdated: new Date().toISOString()
            };
          }
        } catch (e) {
          console.log('Could not parse JSON data:', e);
        }
      }
    }
    
    throw new Error('Could not parse ACHD hourly data from page structure');
    
  } catch (error: any) {
    console.error('Error fetching ACHD hourly data:', error.message);
    
    // Return empty data rather than failing completely
    return {
      success: false,
      data: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Get historical data for chart (last 24 hours or 7 days)
 * Aggregates hourly data into daily averages
 */
export async function getHistoricalDataForChart(days: number = 7): Promise<{
  success: boolean;
  data: Array<{ date: string; pm25: number; aqi: number }>;
}> {
  try {
    const hourlyData = await fetchACHDHourlyData();
    
    if (!hourlyData.success || hourlyData.data.length === 0) {
      throw new Error('No hourly data available');
    }
    
    // Group by date and calculate daily averages
    const dailyMap = new Map<string, { sum: number; count: number }>();
    
    for (const reading of hourlyData.data) {
      const date = reading.datetime.split('T')[0]; // Get YYYY-MM-DD
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { sum: 0, count: 0 });
      }
      
      const entry = dailyMap.get(date)!;
      entry.sum += reading.pm25;
      entry.count += 1;
    }
    
    // Convert to array and calculate AQI
    const result = Array.from(dailyMap.entries())
      .slice(-days) // Get last N days
      .map(([date, stats]) => ({
        date,
        pm25: stats.sum / stats.count,
        aqi: pm25ToAQI(stats.sum / stats.count)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      success: true,
      data: result
    };
    
  } catch (error: any) {
    console.error('Error getting historical data:', error.message);
    return {
      success: false,
      data: []
    };
  }
}

function pm25ToAQI(pm25: number): number {
  if (pm25 <= 12) return Math.round((pm25 / 12) * 50);
  if (pm25 <= 35.4) return Math.round((((pm25 - 12) / (35.4 - 12)) * 49) + 51);
  if (pm25 <= 55.4) return Math.round((((pm25 - 35.4) / (55.4 - 35.4)) * 49) + 101);
  if (pm25 <= 150.4) return Math.round((((pm25 - 55.4) / (150.4 - 55.4)) * 99) + 151);
  return Math.round((((pm25 - 150.4) / (250.4 - 150.4)) * 99) + 201);
}

