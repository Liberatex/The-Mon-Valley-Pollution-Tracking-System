/**
 * SensorMapMapbox - Mapbox GL JS implementation
 * Replaces Leaflet with Mapbox for advanced visualizations
 */

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { shouldUseEmulator } from '../utils/env';
import { applyBarkjohnCalibration } from '../services/barkjohnCalibration';
import { getWindData, calculateDispersionFactor, isUpwind } from '../services/windDataService';
import { calculateWeightedRisk, calculateVulnerabilityScore } from '../services/weightedRiskAlgorithm';
import { Info, AlertCircle, MapPin, Factory, Activity, Navigation } from 'lucide-react';

// Mapbox access token - should be in environment variable
const MAPBOX_TOKEN = process.env.VITE_MAPBOX_ACCESS_TOKEN || '';

export interface Sensor {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  pm25?: number;
  source?: string;
  sensorIndex?: number;
  humidity?: number;
  temperature?: number;
  [key: string]: any;
}

export interface TitleVFacility {
  facilityId: string;
  name: string;
  location: { lat: number; lng: number };
  permitNumber?: string;
  emissions?: any;
}

interface SensorMapMapboxProps {
  sensors?: Sensor[];
  onSensorSelect?: (sensor: Sensor) => void;
}

const CLAIRTON_COORDS = { lat: 40.292, lng: -79.881 };
const MAP_ZOOM = 11;

const SensorMapMapbox: React.FC<SensorMapMapboxProps> = ({ sensors: propSensors, onSensorSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>(propSensors || []);
  const [facilities, setFacilities] = useState<TitleVFacility[]>([]);
  const [achdSites, setAchdSites] = useState<Sensor[]>([]);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showACHD, setShowACHD] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMyLocation, setShowMyLocation] = useState(false);
  const [windData, setWindData] = useState<{ speed: number; direction: number } | null>(null);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      console.error('Mapbox access token not configured. Please set VITE_MAPBOX_ACCESS_TOKEN');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark mode for high contrast
      center: [CLAIRTON_COORDS.lng, CLAIRTON_COORDS.lat],
      zoom: MAP_ZOOM,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch PurpleAir sensors
  useEffect(() => {
    if (propSensors && propSensors.length > 0) {
      setSensors(propSensors);
      return;
    }

    const fetchSensors = async () => {
      setLoading(true);
      try {
        const baseUrl = shouldUseEmulator()
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';

        const response = await axios.get(`${baseUrl}/fetchPurpleAirSensorData`, {
          timeout: 20000,
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data?.success && response.data.data) {
          const calibratedSensors = response.data.data.map((s: any) => {
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
              source: 'PurpleAir',
              sensorIndex: s.sensorIndex,
              humidity: s.humidity,
              temperature: s.temperature,
            };
          }).filter((s: Sensor) => s.location.lat !== 0 && s.location.lng !== 0);

          setSensors(calibratedSensors);
        }
      } catch (error) {
        console.error('Error fetching sensors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSensors();
  }, [propSensors]);

  // Fetch wind data
  useEffect(() => {
    const fetchWind = async () => {
      const wind = await getWindData(CLAIRTON_COORDS.lat, CLAIRTON_COORDS.lng);
      if (wind) {
        setWindData({ speed: wind.speed, direction: wind.direction });
      }
    };
    fetchWind();
  }, []);

  // Add sensors to map
  useEffect(() => {
    if (!map.current || !showSensors || sensors.length === 0) return;

    // Create GeoJSON source for sensors
    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: sensors.map((sensor) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [sensor.location.lng, sensor.location.lat],
        },
        properties: {
          id: sensor.id,
          name: sensor.name,
          pm25: sensor.pm25 || 0,
          source: sensor.source,
        },
      })),
    };

    // Add or update source
    const source = map.current.getSource('sensors') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojsonData);
    } else {
      map.current.addSource('sensors', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Add cluster layer
      map.current.addLayer({
        id: 'sensor-clusters',
        type: 'circle',
        source: 'sensors',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100,
            '#f1f075',
            750,
            '#f28cb1',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
        },
      });

      // Add individual sensor layer
      map.current.addLayer({
        id: 'sensor-points',
        type: 'circle',
        source: 'sensors',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'step',
            ['get', 'pm25'],
            '#00e400', // Green: Good (0-12)
            12,
            '#ffff00', // Yellow: Moderate (12-35)
            35,
            '#ff7e00', // Orange: Unhealthy for Sensitive (35-55)
            55,
            '#ff0000', // Red: Unhealthy (55-150)
            150,
            '#8f3f97', // Purple: Hazardous (>150)
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // Add click handler
      map.current.on('click', 'sensor-points', (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          const sensor = sensors.find((s) => s.id === props.id);
          if (sensor) {
            setSelectedSensor(sensor);
            onSensorSelect?.(sensor);
          }
        }
      });
    }
  }, [map.current, sensors, showSensors, onSensorSelect]);

  // Handle "My Location"
  useEffect(() => {
    if (!showMyLocation || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);

        // Center map on user location
        if (map.current) {
          map.current.flyTo({
            center: [loc.lng, loc.lat],
            zoom: 15,
          });
        }
      },
      () => {
        setUserLocation(null);
      }
    );
  }, [showMyLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading sensors...</div>
      </div>
    );
  }

  return (
    <div className="sensor-map w-full h-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Sensor Map - Mon Valley Air Quality
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Interactive map showing air quality sensors, industrial facilities, and official monitoring stations.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={showSensors}
              onChange={(e) => setShowSensors(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm sm:text-base font-medium">
              <Activity className="inline w-4 h-4 mr-1" />
              PurpleAir Sensors ({sensors.length})
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm sm:text-base font-medium">
              <Factory className="inline w-4 h-4 mr-1" />
              Title V Facilities ({facilities.length})
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={showMyLocation}
              onChange={(e) => setShowMyLocation(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm sm:text-base font-medium">
              <Navigation className="inline w-4 h-4 mr-1" />
              My Location
            </span>
          </label>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        <div
          ref={mapContainer}
          className="w-full h-[600px] rounded-lg shadow-lg"
          style={{ minHeight: '600px' }}
        />

        {/* Wind Info */}
        {windData && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10">
            <div className="text-xs font-semibold text-gray-700 mb-1">Wind Conditions</div>
            <div className="text-sm">
              <div>Speed: {windData.speed.toFixed(1)} m/s</div>
              <div>Direction: {windData.direction.toFixed(0)}°</div>
              <div className="text-xs text-gray-500 mt-1">
                Dispersion: {calculateDispersionFactor(windData.speed).toFixed(2)}x
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Sensor Info */}
      {selectedSensor && (
        <div className="mx-4 sm:mx-6 lg:px-8 mt-4 p-4 bg-white rounded-lg shadow-lg">
          <h3 className="font-bold text-lg mb-2">{selectedSensor.name}</h3>
          <div className="space-y-1 text-sm">
            <div>
              <strong>PM2.5:</strong> {selectedSensor.pm25?.toFixed(2)} μg/m³
            </div>
            {selectedSensor.humidity && (
              <div>
                <strong>Humidity:</strong> {selectedSensor.humidity.toFixed(1)}%
              </div>
            )}
            {windData && (
              <div className="text-xs text-gray-500 mt-2">
                Wind: {windData.speed.toFixed(1)} m/s from {windData.direction.toFixed(0)}°
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorMapMapbox;

