/**
 * useRealtimeSensorData Hook
 * Polls backend API every 5 minutes for latest sensor data (reduced from 60s to save API points)
 * Backend caches data for 10 minutes, so this provides fresh data while minimizing API calls
 * Updates Mapbox GeoJSON source in real-time
 */

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { shouldUseEmulator } from '../utils/env';
import { applyBarkjohnCalibration } from '../services/barkjohnCalibration';

export interface SensorData {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  pm25: number;
  humidity?: number;
  temperature?: number;
  source: string;
  timestamp: Date;
}

// Reduced polling interval from 60s to 15 minutes (900000ms) to dramatically reduce API calls
// Backend caches for 30 minutes, so this still provides fresh data while minimizing costs
export function useRealtimeSensorData(intervalMs: number = 900000) {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSensorData = async () => {
    const baseUrl = shouldUseEmulator()
      ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
      : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';

    try {
      const response = await axios.get(`${baseUrl}/fetchPurpleAirSensorData`, {
        timeout: 45000, // Increased to 45 seconds to handle cold starts and cache operations
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📡 PurpleAir API Response:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        dataLength: response.data?.data?.length || 0,
        count: response.data?.count,
        cached: response.data?.cached,
        cacheAgeHours: response.data?.cacheAgeHours,
        cacheAgeDays: response.data?.cacheAgeDays,
        source: response.data?.source,
        note: response.data?.note,
        message: response.data?.message,
      });
      
      // Log cache status prominently if using cached data
      if (response.data?.cached) {
        const age = response.data.cacheAgeHours 
          ? `${response.data.cacheAgeHours} hours`
          : response.data.cacheAgeDays 
          ? `${response.data.cacheAgeDays} days`
          : 'unknown';
        console.log(`✅ Using CACHED sensor data (${age} old) - Source: ${response.data.source}`);
        console.log(`📝 Note: ${response.data.note || 'Using cached data as fallback'}`);
      }

      if (response.data?.success && response.data.data) {
        const calibratedSensors: SensorData[] = response.data.data
          .map((s: any) => {
            // Apply Barkjohn calibration
            const calibrated = applyBarkjohnCalibration(
              s.pm25 || 0,
              s.humidity || 50,
              s.temperature
            );

            return {
              id: s.id || `pa-${s.sensorIndex}`,
              name: s.name || `Sensor ${s.sensorIndex}`,
              location: s.location || { lat: 0, lng: 0 },
              pm25: calibrated.correctedPM,
              humidity: s.humidity,
              temperature: s.temperature,
              source: 'PurpleAir',
              timestamp: new Date(),
            };
          })
          .filter((s: SensorData) => s.location.lat !== 0 && s.location.lng !== 0);

        console.log(`✅ Processed ${calibratedSensors.length} calibrated sensors from API`);
        setSensors(calibratedSensors);
        setError(null);
      } else {
        console.warn('⚠️ API response missing data:', response.data);
        setSensors([]);
        setError(response.data?.message || 'No sensor data returned from API');
      }
    } catch (err: any) {
      console.error('❌ Error fetching sensor data:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code,
        url: `${baseUrl}/fetchPurpleAirSensorData`,
      });
      setError(err.response?.data?.message || err.message || 'Failed to fetch sensor data');
      setSensors([]); // Clear sensors on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSensorData();

    // Set up polling
    intervalRef.current = setInterval(() => {
      fetchSensorData();
    }, intervalMs);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs]);

  return { sensors, loading, error, refetch: fetchSensorData };
}

