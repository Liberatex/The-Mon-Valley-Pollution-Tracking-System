/**
 * useRealtimeSensorData Hook
 * Polls backend API every 60 seconds for latest sensor data
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

export function useRealtimeSensorData(intervalMs: number = 60000) {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSensorData = async () => {
    try {
      const baseUrl = shouldUseEmulator()
        ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
        : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';

      const response = await axios.get(`${baseUrl}/fetchPurpleAirSensorData`, {
        timeout: 20000,
        headers: { 'Content-Type': 'application/json' },
      });

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

        setSensors(calibratedSensors);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching sensor data:', err);
      setError(err.message || 'Failed to fetch sensor data');
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

