/**
 * SensorMapMapbox - Mapbox GL JS implementation
 * Replaces Leaflet with Mapbox for advanced visualizations
 */

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { shouldUseEmulator, env } from '../utils/env';
import { applyBarkjohnCalibration } from '../services/barkjohnCalibration';
import { getWindData, calculateDispersionFactor, isUpwind } from '../services/windDataService';
import { calculateWeightedRisk, calculateVulnerabilityScore } from '../services/weightedRiskAlgorithm';
import { useRealtimeSensorData } from '../hooks/useRealtimeSensorData';
import { fetchSmellPGHReports, clusterOdorReports, OdorCluster, calculateLocationOdorScore } from '../services/smellPGHService';
import { generateRiskZone, detectPollutionEvents, RiskZone, generateHexGridOverlay } from '../services/riskZoneService';
import { getHealthProfile, HealthProfile } from '../services/vulnerabilityStorage';
import { calculateToxicityWeight } from '../services/toxicityWeightService';
import { getVCANDistributionLocations, VCANDistributionLocation } from '../services/vcanDistributionService';
import { getAuth } from 'firebase/auth';
import * as turf from '@turf/turf';
import { Info, AlertCircle, MapPin, Factory, Activity, Navigation, X, AlertTriangle, Heart } from 'lucide-react';
import MapShareButton from './MapShareButton';

// Mapbox access token from environment variable
const MAPBOX_TOKEN = env.MAPBOX_ACCESS_TOKEN || '';

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

// Convert wind direction in degrees to compass direction
const degreesToCompass = (degrees: number): string => {
  // Normalize degrees to 0-360 range
  const normalized = ((degrees % 360) + 360) % 360;
  
  // 8 compass directions: N, NE, E, SE, S, SW, W, NW
  // Each direction covers 45 degrees (360 / 8 = 45)
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
};

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
  const [selectedFacility, setSelectedFacility] = useState<TitleVFacility | null>(null);
  const [smellClusters, setSmellClusters] = useState<OdorCluster[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [showSmellReports, setShowSmellReports] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showVCANDistribution, setShowVCANDistribution] = useState(false);
  const [vcanLocations, setVcanLocations] = useState<VCANDistributionLocation[]>([]);
  const [hiddenRiskZones, setHiddenRiskZones] = useState<Set<string>>(new Set()); // Track clicked/hidden zones
  const [facilityCompliance, setFacilityCompliance] = useState<any>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [triFacilities, setTriFacilities] = useState<any[]>([]);
  const [userHealthProfile, setUserHealthProfile] = useState<HealthProfile | null>(null);
  const riskZoneClickHandlerRef = useRef<((e: mapboxgl.MapLayerMouseEvent) => void) | null>(null);
  
  // Use real-time polling hook (15 minutes - dramatically reduced to save API points)
  // Backend caches for 30 minutes, so this provides fresh data while minimizing API calls
  const { sensors: realtimeSensors, loading: sensorsLoading } = useRealtimeSensorData(900000);

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

    // Add terrain source (elevation data) after map loads
    map.current.on('load', () => {
      if (map.current) {
        try {
          // Add Mapbox DEM source for elevation/terrain
          map.current.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });

          // Enable terrain (3D elevation)
          map.current.setTerrain({
            source: 'mapbox-dem',
            exaggeration: 1.5, // Exaggerate elevation for visibility
          });
        } catch (error) {
          console.warn('Terrain/elevation data not available. This may require Mapbox account upgrade.', error);
        }
      }
    });

    // Add navigation controls (including 3D tilt/rotation)
    // Positioned below wind conditions and legend to avoid blocking
    const navControl = new mapboxgl.NavigationControl();
    map.current.addControl(navControl, 'top-right');
    
    // Adjust zoom controls position via CSS to be below wind/legend panels
    // Wait for map to fully load before adjusting
    map.current.on('load', () => {
      setTimeout(() => {
        const navElement = map.current?.getContainer().querySelector('.mapboxgl-ctrl-top-right');
        if (navElement) {
          const isMobile = window.innerWidth < 640;
          (navElement as HTMLElement).style.top = isMobile ? '100px' : '120px'; // Below wind conditions and legend
          (navElement as HTMLElement).style.right = '8px';
          (navElement as HTMLElement).style.transition = 'top 0.3s ease';
        }
      }, 200);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Use real-time sensors or fallback to propSensors
  // IMPORTANT: Preserve sensors even if realtimeSensors temporarily becomes empty
  useEffect(() => {
    console.log(`🔍 Sensor update check:`, {
      realtimeSensorsCount: realtimeSensors.length,
      propSensorsCount: propSensors?.length || 0,
      currentSensorsCount: sensors.length,
      realtimeLoading: sensorsLoading,
    });

    if (realtimeSensors.length > 0) {
      console.log(`✅ Updating sensors from realtime hook: ${realtimeSensors.length} sensors`);
      console.log(`   Sample sensor:`, realtimeSensors[0]);
      setSensors(realtimeSensors);
    } else if (propSensors && propSensors.length > 0) {
      console.log(`✅ Using propSensors: ${propSensors.length} sensors`);
      setSensors(propSensors);
    } else if (sensors.length === 0 && !sensorsLoading) {
      // Only clear sensors if we have no sensors at all and no new data (and not loading)
      console.warn('⚠️ No sensors available from any source');
    }
    // Don't clear sensors if realtimeSensors becomes empty temporarily (preserve existing)
  }, [realtimeSensors, propSensors, sensorsLoading]);

  // Fetch Title V facilities (VCAN requirement)
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const baseUrl = shouldUseEmulator()
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';

        // First, try to seed facilities if collection is empty (only in emulator mode)
        if (shouldUseEmulator()) {
          try {
            await axios.post(`${baseUrl}/seedTitleVFacilities`, {}, {
              timeout: 15000,
            });
            console.log('✅ Seeded Title V facilities');
          } catch (seedError: any) {
            // Ignore seed errors (might already be seeded or auth required)
            console.log('ℹ️ Seed attempt:', seedError.response?.status === 401 ? 'Auth required (expected)' : seedError.message);
          }
        }

        const response = await axios.get(`${baseUrl}/getTitleVFacilities`, {
          timeout: 10000,
        });

        console.log('📋 Title V facilities response:', {
          success: response.data?.success,
          count: response.data?.facilities?.length || 0,
        });

        if (response.data?.success && response.data.facilities) {
          const validFacilities = response.data.facilities.filter((f: any) => 
            f.location?.lat && f.location?.lng &&
            !isNaN(f.location.lat) && !isNaN(f.location.lng) &&
            f.location.lat !== 0 && f.location.lng !== 0
          );
          console.log(`✅ Loaded ${validFacilities.length} valid Title V facilities`);
          setFacilities(validFacilities);
        } else {
          console.warn('⚠️ No facilities returned from API');
        }
      } catch (error: any) {
        console.error('❌ Error fetching Title V facilities:', error.message || error);
      }
    };

    fetchFacilities();
  }, []);

  // Load VCAN distribution locations (using hardcoded coordinates - no API calls)
  useEffect(() => {
    try {
      const locations = getVCANDistributionLocations();
      setVcanLocations(locations);
      console.log(`✅ Loaded ${locations.length} VCAN distribution locations`);
      if (locations.length > 0) {
        console.log(`📍 Sample location: ${locations[0].address}, ${locations[0].city} - Coords: (${locations[0].location?.lat}, ${locations[0].location?.lng})`);
      } else {
        console.warn('⚠️ No VCAN locations loaded. Check if coordinates file is populated or fallback is working.');
      }
    } catch (error: any) {
      console.error('❌ Error loading VCAN locations:', error.message || error);
    }
  }, []);

  // Fetch Smell PGH reports and cluster them (VCAN requirement)
  useEffect(() => {
    const fetchSmellData = async () => {
      try {
        // Mon Valley bounding box (expanded to include more area)
        const boundingBox = {
          north: 40.6,  // Expanded north
          south: 40.2,  // Expanded south
          east: -79.5,  // Expanded east
          west: -80.2,  // Expanded west
        };
        
        // Fetch last 7 days of reports with smell value 2+ (lower threshold to get more data)
        // Smell PGH API: https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/How-to-use-the-API
        const reports = await fetchSmellPGHReports(boundingBox, 7, 2);
        console.log(`✅ Fetched ${reports.length} Smell PGH reports from API`);
        
        if (reports.length > 0) {
          // Cluster reports (lower thresholds to show more clusters)
          const clusters = clusterOdorReports(reports, 0.015, 2); // Increased maxDistance to 0.015 (~1.5km), minReports = 2
          setSmellClusters(clusters);
          console.log(`✅ Clustered ${reports.length} reports into ${clusters.length} odor events`);
          
          // Log cluster details for debugging
          clusters.forEach((cluster, idx) => {
            console.log(`  Cluster ${idx + 1}: ${cluster.clusterSize} reports, avg smell ${cluster.averageSmell.toFixed(1)}, center (${cluster.center.lat.toFixed(4)}, ${cluster.center.lng.toFixed(4)})`);
          });
        } else {
          console.warn('⚠️ No Smell PGH reports found in the area. This may be normal if there are no recent reports in the last 7 days.');
          setSmellClusters([]);
        }
      } catch (error: any) {
        console.error('❌ Error fetching Smell PGH data:', error);
        console.error('Error details:', error.response?.data || error.message);
        console.error('Error stack:', error.stack);
        setSmellClusters([]); // Clear clusters on error
      }
    };

    fetchSmellData();
    // Refresh every 5 minutes (as per VCAN requirement for real-time updates)
    const interval = setInterval(fetchSmellData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Generate risk zones based on pollution events using Weighted Risk Algorithm (VCAN requirement)
  useEffect(() => {
    if (sensors.length === 0 || !showRiskZones) {
      // Don't generate zones if no sensors or zones are hidden
      setRiskZones([]);
      return;
    }
    
    // If windData is not available, use default values (zones will still generate)
    if (!windData) {
      console.warn('⚠️ Wind data not available for risk zones, using default dispersion factor');
    }

    console.log(`🔄 Generating risk zones from ${sensors.length} sensors...`);

    // Calculate weighted risk for each sensor to detect events
    const sensorsWithRisk = sensors.map((sensor) => {
      // Get odor score for this location
      const odorScore = calculateLocationOdorScore(
        sensor.location.lat,
        sensor.location.lng,
        smellClusters
      );

      // Calculate toxicity weight using TRI data (VCAN requirement: W_tox from EPA TRI)
      let toxicityWeight = 1.0;
      // Use wind direction if available, otherwise use default (neutral)
      const windDirection = windData?.direction || 0;
      
      if (triFacilities.length > 0) {
        // Use TRI-based toxicity weight calculation (preferred method)
        toxicityWeight = calculateToxicityWeight(
          sensor.location.lat,
          sensor.location.lng,
          triFacilities,
          windDirection
        );
      } else if (facilities.length > 0 && windData) {
        // Fallback: Manual calculation based on Title V facilities (only if wind data available)
        const upwindFacilities = facilities.filter((facility) => {
          if (!facility.location?.lat || !facility.location?.lng) return false;
          return isUpwind(
            sensor.location.lat,
            sensor.location.lng,
            facility.location.lat,
            facility.location.lng,
            windData.direction
          );
        });

        upwindFacilities.forEach((facility) => {
          const distance = Math.sqrt(
            Math.pow(facility.location.lat - sensor.location.lat, 2) +
            Math.pow(facility.location.lng - sensor.location.lng, 2)
          );
          const distanceKm = distance * 111;
          const distanceWeight = distanceKm < 5 ? 1.0 : Math.max(0.3, 1 - (distanceKm - 5) / 20);
          const emissionsWeight = facility.emissions?.totalAirReleases 
            ? Math.min(1.5, 1.0 + (facility.emissions.totalAirReleases / 10000))
            : 1.0;
          toxicityWeight = Math.max(toxicityWeight, 1.0 + (distanceWeight * emissionsWeight * 0.5));
        });
        toxicityWeight = Math.min(2.0, toxicityWeight);
      }

      // Get dispersion factor (use default if wind data not available)
      const dispersionFactor = windData 
        ? calculateDispersionFactor(windData.speed)
        : 1.0;

      // IMPORTANT: sensor.pm25 from useRealtimeSensorData is already Barkjohn-calibrated
      // Use it directly - DO NOT apply calibration again
      const calibratedPMValue = sensor.pm25 || 0;

      // Get vulnerability score (V_user) from user health profile
      const vulnerabilityScore = userHealthProfile?.vulnerabilityScore || 1.0;

      // Calculate weighted risk using the correct formula:
      // Risk = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user
      const riskResult = calculateWeightedRisk({
        pm25Calibrated: calibratedPMValue, // Use already-calibrated PM from hook
        toxicityWeight,
        dispersionFactor,
        odorScore,
        odorWeight: 1.2,
        vulnerabilityScore, // Use user profile if available, otherwise 1.0
      });

            return {
        lat: sensor.location.lat,
        lng: sensor.location.lng,
        riskIndex: riskResult.riskIndex,
        riskLevel: riskResult.riskLevel,
      };
    });

    // Detect events based on weighted risk index (not raw PM2.5)
    // Thresholds based on weighted risk levels:
    // Elevated: 10-50, High: 50-75, Severe: 75-100, Toxic: 100+
    // Lowered threshold to 10 to show zones even with low PM2.5 readings
    const events = sensorsWithRisk
      .filter(s => {
        const hasElevatedRisk = s.riskIndex >= 10;
        if (hasElevatedRisk) {
          console.log(`   ⚠️ Event detected: Sensor at [${s.lat}, ${s.lng}] - Risk Index: ${s.riskIndex.toFixed(2)}, Level: ${s.riskLevel}`);
        }
        return hasElevatedRisk;
      })
      .map(s => ({
        lat: s.lat,
        lng: s.lng,
        severity: s.riskLevel === 'toxic' ? 'toxic' :
                 s.riskLevel === 'severe' ? 'severe' :
                 s.riskLevel === 'high' ? 'high' :
                 s.riskLevel === 'elevated' ? 'moderate' :
                 'moderate' as 'moderate' | 'high' | 'severe' | 'toxic',
        riskIndex: s.riskIndex, // Include for debugging
      }));

    console.log(`✅ Detected ${events.length} pollution events using weighted risk algorithm (threshold: riskIndex >= 25)`);
    if (events.length === 0 && sensorsWithRisk.length > 0) {
      const maxRisk = Math.max(...sensorsWithRisk.map(s => s.riskIndex));
      const maxRiskSensor = sensorsWithRisk.find(s => s.riskIndex === maxRisk);
      console.log(`   ℹ️ No events detected. Max risk index: ${maxRisk.toFixed(2)} (${maxRiskSensor?.riskLevel || 'unknown'}) at [${maxRiskSensor?.lat}, ${maxRiskSensor?.lng}]`);
    }

    // Generate granular hex grid overlay for better visualization
    // Get map bounds for hex grid coverage
    if (map.current) {
      const bounds = map.current.getBounds();
      if (bounds) {
        const mapBounds = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        };
        
        // Generate hex grid overlay (0.5km hexagons for granular view)
        const hexGridZones = generateHexGridOverlay(
          mapBounds,
          0.5, // 500m hexagons - very granular
          sensorsWithRisk
        );
        
        setRiskZones(hexGridZones);
        console.log(`Created ${hexGridZones.length} granular hex grid zones covering the map`);
      } else {
        // Fallback: generate zones from events if bounds not available
        const windSpeed = windData?.speed || 5;
        const windDirection = windData?.direction || 180;
        
        if (events.length > 0) {
          const zones = events.map(event => 
            generateRiskZone(
              event.lat,
              event.lng,
              { speed: windSpeed, direction: windDirection, timestamp: new Date() },
              event.severity
            )
          );
          setRiskZones(zones);
          console.log(`Created ${zones.length} risk zones from weighted risk events`);
        } else {
          setRiskZones([]);
        }
      }
    } else {
      // Fallback: generate zones from events if map not ready
      const windSpeed = windData?.speed || 5;
      const windDirection = windData?.direction || 180;
      
      if (events.length > 0) {
        const zones = events.map(event => 
          generateRiskZone(
            event.lat,
            event.lng,
            { speed: windSpeed, direction: windDirection, timestamp: new Date() },
            event.severity
          )
        );
        setRiskZones(zones);
        console.log(`Created ${zones.length} risk zones from weighted risk events`);
      } else {
        // Fallback: create zones from high smell clusters if no weighted risk events
        if (smellClusters.length > 0) {
        const smellEvents = smellClusters
          .filter(cluster => cluster.averageSmell >= 3)
          .map(cluster => ({
            lat: cluster.center.lat,
            lng: cluster.center.lng,
            severity: (cluster.averageSmell >= 4 ? 'high' : 'moderate') as 'high' | 'moderate' | 'severe' | 'toxic',
          }));
        
        const zones = smellEvents.map(event => 
          generateRiskZone(
            event.lat,
            event.lng,
            { speed: windSpeed, direction: windDirection, timestamp: new Date() },
            event.severity
          )
        );
          setRiskZones(zones);
          console.log(`Created ${zones.length} risk zones from smell clusters (fallback)`);
        } else {
          setRiskZones([]);
        }
      }
    }
  }, [sensors, smellClusters, windData, facilities, triFacilities, userHealthProfile, showRiskZones, hiddenRiskZones, map.current]);

  // Fetch wind data - use backend function if frontend API key not available
  useEffect(() => {
    const fetchWind = async () => {
      // Try frontend API key first
      let wind = await getWindData(CLAIRTON_COORDS.lat, CLAIRTON_COORDS.lng, env.OPENWEATHER_API_KEY);
      
      // If frontend key not available, use backend function
      if (!wind) {
        try {
          const baseUrl = shouldUseEmulator()
            ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
            : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
          
          const response = await axios.get(`${baseUrl}/getWindData`, {
            params: {
              lat: CLAIRTON_COORDS.lat,
              lng: CLAIRTON_COORDS.lng,
            },
            timeout: 10000,
          });
          
          if (response.data?.success && response.data.data) {
            wind = {
              speed: response.data.data.speed || 0,
              direction: response.data.data.direction || 0,
              timestamp: new Date(response.data.data.timestamp || Date.now()),
            };
          }
        } catch (err) {
          console.warn('Could not fetch wind data from backend:', err);
        }
      }
      
      if (wind) {
        setWindData({ speed: wind.speed, direction: wind.direction });
      } else {
        // Use default wind data if API unavailable
        console.warn('Using default wind data (5 m/s, 180°)');
        setWindData({ speed: 5, direction: 180 });
      }
    };
    fetchWind();
  }, []);

  // Fetch TRI facilities for toxicity weight calculation (W_tox)
  useEffect(() => {
    const fetchTRIFacilities = async () => {
      try {
        const baseUrl = shouldUseEmulator()
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        
        const triResponse = await axios.get(`${baseUrl}/getTRIFacilities`, { timeout: 15000 });
        if (triResponse.data?.success && triResponse.data.facilities) {
          setTriFacilities(triResponse.data.facilities);
          console.log(`✅ Loaded ${triResponse.data.facilities.length} TRI facilities for toxicity weight calculation`);
        } else {
          console.warn('TRI facilities response missing data, using defaults');
          setTriFacilities([]);
        }
      } catch (error: any) {
        console.warn('Could not fetch TRI facilities, using defaults:', error.message);
        setTriFacilities([]);
      }
    };
    fetchTRIFacilities();
  }, []);

  // Fetch user health profile for vulnerability score (V_user)
  useEffect(() => {
    const fetchUserHealthProfile = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          // No user logged in, use default V_user = 1.0
          setUserHealthProfile(null);
          return;
        }

        const profile = await getHealthProfile(user.uid);
        if (profile) {
          setUserHealthProfile(profile);
          console.log(`✅ Loaded user health profile: V_user = ${profile.vulnerabilityScore.toFixed(2)}`);
        } else {
          // No profile exists, use default
          setUserHealthProfile(null);
        }
      } catch (error: any) {
        console.warn('Could not fetch user health profile, using default V_user = 1.0:', error.message);
        setUserHealthProfile(null);
      }
    };
    fetchUserHealthProfile();
  }, []);

  // Add sensors to map with weighted risk (VCAN requirement)
  useEffect(() => {
    console.log(`🔍 Sensor rendering check:`, {
      mapReady: !!map.current,
      showSensors,
      sensorsCount: sensors.length,
      realtimeSensorsCount: realtimeSensors.length,
      windDataAvailable: !!windData,
    });

    if (!map.current) {
      console.warn('⚠️ Map not ready yet');
      return;
    }
    
    if (!showSensors) {
      console.warn('⚠️ Sensors are hidden (showSensors = false)');
      return;
    }
    
    if (sensors.length === 0) {
      console.warn('⚠️ No sensors available. realtimeSensors:', realtimeSensors.length, 'propSensors:', propSensors?.length || 0);
      return;
    }
    
    // If windData is not available yet, use default values for risk calculation
    // Sensors will still render, but risk will be calculated with default dispersion factor
    if (!windData) {
      console.warn('⚠️ Wind data not available yet, using default dispersion factor (1.0)');
    }

    console.log(`🔄 Calculating weighted risk for ${sensors.length} sensors...`);
    console.log(`   TRI Facilities: ${triFacilities.length}, User Profile: ${userHealthProfile ? 'Yes' : 'No'}`);

    // Calculate weighted risk for each sensor using the correct formula
    const sensorsWithRisk = sensors.map((sensor) => {
      // IMPORTANT: useRealtimeSensorData hook already applies Barkjohn calibration
      // sensor.pm25 is already calibrated, so use it directly
      // DO NOT apply calibration again or we'll double-calibrate and get incorrect low values
      const calibratedPMValue = sensor.pm25 || 0;
      
      // For display/debugging: if we had raw PM2.5, we'd show it, but hook doesn't provide it
      // The calibrated value is what we use for risk calculation

      // Get odor score for this location
      const odorScore = calculateLocationOdorScore(
        sensor.location.lat,
        sensor.location.lng,
        smellClusters
      );

      // Calculate toxicity weight using TRI data (VCAN requirement: W_tox from EPA TRI)
      // Use TRI facilities if available, otherwise fall back to Title V facilities
      let toxicityWeight = 1.0; // Default baseline
      
      // Use wind direction if available, otherwise use default (neutral)
      const windDirection = windData?.direction || 0;
      
      if (triFacilities.length > 0) {
        // Use TRI-based toxicity weight calculation (preferred method)
        toxicityWeight = calculateToxicityWeight(
          sensor.location.lat,
          sensor.location.lng,
          triFacilities,
          windDirection
        );
      } else if (facilities.length > 0 && windData) {
        // Fallback: Manual calculation based on Title V facilities (only if wind data available)
        const upwindFacilities = facilities.filter((facility) => {
          if (!facility.location?.lat || !facility.location?.lng) return false;
          return isUpwind(
            sensor.location.lat,
            sensor.location.lng,
            facility.location.lat,
            facility.location.lng,
            windData.direction
          );
        });

        upwindFacilities.forEach((facility) => {
          const distance = Math.sqrt(
            Math.pow(facility.location.lat - sensor.location.lat, 2) +
            Math.pow(facility.location.lng - sensor.location.lng, 2)
          );
          const distanceKm = distance * 111;
          const distanceWeight = distanceKm < 5 ? 1.0 : Math.max(0.3, 1 - (distanceKm - 5) / 20);
          const emissionsWeight = facility.emissions?.totalAirReleases 
            ? Math.min(1.5, 1.0 + (facility.emissions.totalAirReleases / 10000))
            : 1.0;
          toxicityWeight = Math.max(toxicityWeight, 1.0 + (distanceWeight * emissionsWeight * 0.5));
        });
        toxicityWeight = Math.min(2.0, toxicityWeight);
      }

      // Get dispersion factor from wind (W_wind)
      // Use default 1.0 if wind data not available (neutral dispersion)
      const dispersionFactor = windData 
        ? calculateDispersionFactor(windData.speed)
        : 1.0;

      // Get vulnerability score (V_user) from user health profile
      const vulnerabilityScore = userHealthProfile?.vulnerabilityScore || 1.0;

      // Calculate weighted risk using the correct formula:
      // Risk = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user
      const riskResult = calculateWeightedRisk({
        pm25Calibrated: calibratedPMValue, // Use already-calibrated PM from hook
        toxicityWeight,
        dispersionFactor,
        odorScore,
        odorWeight: 1.2, // Default odor weight
        vulnerabilityScore, // Use user profile if available, otherwise 1.0
      });

      return {
        ...sensor,
        pm25Calibrated: calibratedPMValue, // Store calibrated PM for display (already calibrated from hook)
        riskIndex: riskResult.riskIndex,
        riskLevel: riskResult.riskLevel, // CRITICAL: This is what colors the map
        riskColor: riskResult.riskColor,
        recommendation: riskResult.recommendation,
        toxicityWeight,
        dispersionFactor,
        odorScore, // Store for debugging
        vulnerabilityScore, // Store for debugging
      };
    });

    // Log risk distribution for debugging
    const riskDistribution = sensorsWithRisk.reduce((acc, s) => {
      acc[s.riskLevel] = (acc[s.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`📊 Risk Distribution:`, riskDistribution);
    const sampleSensor = sensorsWithRisk[0];
    if (sampleSensor) {
      console.log(`   Sample sensor:`, {
        id: sampleSensor.id,
        pm25Calibrated: sampleSensor.pm25Calibrated?.toFixed(2),
        riskIndex: sampleSensor.riskIndex?.toFixed(2),
        riskLevel: sampleSensor.riskLevel,
        toxicityWeight: sampleSensor.toxicityWeight?.toFixed(2),
        dispersionFactor: sampleSensor.dispersionFactor?.toFixed(2),
        odorScore: sampleSensor.odorScore?.toFixed(2),
        vulnerabilityScore: sampleSensor.vulnerabilityScore?.toFixed(2),
      });
    }

    // Create GeoJSON source for sensors with risk data
    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: sensorsWithRisk.map((sensor) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [sensor.location.lng, sensor.location.lat],
        },
        properties: {
          id: sensor.id,
          name: sensor.name,
          pm25: sensor.pm25 || 0, // Original PM2.5 value
          pm25Calibrated: sensor.pm25Calibrated || sensor.pm25 || 0,
          source: sensor.source,
          riskIndex: sensor.riskIndex || 0,
          riskLevel: sensor.riskLevel || 'low', // CRITICAL: This is what colors the map circles
          riskColor: sensor.riskColor || 'green',
          // Ensure riskLevel is always set correctly
          _riskLevel: sensor.riskLevel || 'low', // Backup property
        },
      })),
    };

    // Add or update source
    const source = map.current.getSource('sensors') as mapboxgl.GeoJSONSource;
    if (source) {
      console.log(`✅ Updating existing sensor source with ${geojsonData.features.length} sensors`);
      source.setData(geojsonData);
    } else {
      console.log(`✅ Creating new sensor source with ${geojsonData.features.length} sensors`);
      map.current.addSource('sensors', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    }

    // Ensure layers exist (add if they don't)
      // Add cluster layer (visible at zoom 0-10)
    if (!map.current.getLayer('sensor-clusters')) {
      console.log('✅ Adding sensor-clusters layer');
      map.current.addLayer({
        id: 'sensor-clusters',
        type: 'circle',
        source: 'sensors',
        filter: ['has', 'point_count'],
        minzoom: 0,
        maxzoom: 10,
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
    }

      // Add cluster count labels (zoom 0-10)
    if (!map.current.getLayer('sensor-cluster-count')) {
      console.log('✅ Adding sensor-cluster-count layer');
      map.current.addLayer({
        id: 'sensor-cluster-count',
        type: 'symbol',
        source: 'sensors',
        filter: ['has', 'point_count'],
        minzoom: 0,
        maxzoom: 10,
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#fff',
        },
      });
    }

    // Add individual sensor layer with weighted risk colors (VCAN requirement)
    if (!map.current.getLayer('sensor-points')) {
      console.log('✅ Adding sensor-points layer to map');
      map.current.addLayer({
        id: 'sensor-points',
        type: 'circle',
        source: 'sensors',
        filter: ['!', ['has', 'point_count']],
        minzoom: 11,
        paint: {
          // Use weighted risk colors based on riskLevel property
          // IMPORTANT: Must use riskLevel from weighted risk calculation, not raw PM2.5
          // Use _riskLevel as fallback to ensure we always get a value
          'circle-color': [
            'coalesce',
            [
              'match',
              ['get', 'riskLevel'],
              'low', '#00e400',      // Green
              'elevated', '#ffff00', // Yellow
              'high', '#ff7e00',     // Orange
              'severe', '#ff0000',   // Red
              'toxic', '#9c27b0',    // Purple
              '#00e400', // Default to green if riskLevel doesn't match
            ],
            [
              'match',
              ['get', '_riskLevel'],
              'low', '#00e400',
              'elevated', '#ffff00',
              'high', '#ff7e00',
              'severe', '#ff0000',
              'toxic', '#9c27b0',
              '#00e400',
            ],
            '#00e400', // Final fallback to green
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 6,  // Zoom 11: 6px radius
            14, 10, // Zoom 14: 10px radius
            15, 12, // Zoom 15+: 12px radius
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });
    } else {
      console.log('✅ sensor-points layer already exists');
    }

    // Ensure layer visibility matches showSensors state
    if (map.current.getLayer('sensor-points')) {
      map.current.setLayoutProperty('sensor-points', 'visibility', showSensors ? 'visible' : 'none');
    }
    if (map.current.getLayer('sensor-clusters')) {
      map.current.setLayoutProperty('sensor-clusters', 'visibility', showSensors ? 'visible' : 'none');
    }
    if (map.current.getLayer('sensor-cluster-count')) {
      map.current.setLayoutProperty('sensor-cluster-count', 'visibility', showSensors ? 'visible' : 'none');
    }

    // Add click handlers (Mapbox handles duplicates, but we'll add them each time the effect runs)
    // Note: This is safe because Mapbox will handle the event properly
    if (map.current.getLayer('sensor-points')) {
      // Add click handler with Mapbox popup (VCAN requirement - popup on map)
      map.current.on('click', 'sensor-points', (e) => {
        if (e.features && e.features[0] && e.lngLat && e.features[0].properties) {
          const props = e.features[0].properties;
          // Find sensor with risk data
          const sensorWithRisk = sensorsWithRisk.find((s) => s.id === props.id);
          if (sensorWithRisk && map.current) {
            setSelectedSensor(sensorWithRisk);
            onSensorSelect?.(sensorWithRisk);
            
            // Create popup content with weighted risk information
            const riskColor = (sensorWithRisk as any).riskColor || 'green';
            const riskLevel = (sensorWithRisk as any).riskLevel || 'low';
            const riskIndex = (sensorWithRisk as any).riskIndex || 0;
            const recommendation = (sensorWithRisk as any).recommendation || '';
            
            const colorHex = riskColor === 'green' ? '#00e400' :
                            riskColor === 'yellow' ? '#ffff00' :
                            riskColor === 'orange' ? '#ff7e00' :
                            riskColor === 'red' ? '#ff0000' :
                            riskColor === 'purple' ? '#9c27b0' : '#00e400';
            
            // Detect mobile screen size for responsive popup
            const isMobile = window.innerWidth < 640;
            const popupMinWidth = isMobile ? '200px' : '250px';
            const popupMaxWidth = isMobile ? '280px' : '350px';
            const popupMaxWidthMapbox = isMobile ? '280px' : '400px';
            
            const popupContent = `
              <div style="min-width: ${popupMinWidth}; max-width: ${popupMaxWidth};">
                <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${colorHex}; flex-shrink: 0; margin-top: 4px;"></div>
                  <div style="flex: 1;">
                    <h3 style="font-weight: bold; font-size: ${isMobile ? '14px' : '16px'}; margin: 0 0 4px 0; color: #1f2937;">${sensorWithRisk.name || 'Sensor'}</h3>
                    <p style="font-size: ${isMobile ? '11px' : '12px'}; color: #6b7280; margin: 0;">${sensorWithRisk.source || 'Unknown Source'}</p>
                  </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 13px;">
                  <div>
                    <strong style="color: #374151;">PM2.5 (Calibrated):</strong><br/>
                    <span style="color: #1f2937;">${sensorWithRisk.pm25Calibrated?.toFixed(2) || sensorWithRisk.pm25?.toFixed(2) || 'N/A'} μg/m³</span>
                    ${sensorWithRisk.pm25Calibrated && sensorWithRisk.pm25 ? `
                    <br/><small style="color: #6b7280;">Raw: ${sensorWithRisk.pm25.toFixed(2)} μg/m³</small>
                    ` : ''}
                  </div>
                  <div>
                    <strong style="color: #374151;">Risk Level:</strong><br/>
                    <span style="color: ${colorHex}; font-weight: 600; text-transform: capitalize;">${riskLevel}</span>
                  </div>
                </div>
                
                ${riskIndex > 0 ? `
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Weighted Risk Index:</strong><br/>
                  <span style="color: #1f2937; font-weight: 600;">${riskIndex.toFixed(2)}</span>
                </div>
                ` : ''}
                
                ${sensorWithRisk.humidity ? `
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Humidity:</strong> ${sensorWithRisk.humidity.toFixed(1)}%
                </div>
                ` : ''}
                
                ${windData ? `
                <div style="background-color: #f9fafb; padding: 8px; border-radius: 4px; margin-bottom: 12px; font-size: 12px; color: #6b7280;">
                  <strong style="color: #374151;">Wind Conditions:</strong><br/>
                  Speed: ${windData.speed.toFixed(1)} m/s | Direction: ${degreesToCompass(windData.direction)} (${windData.direction.toFixed(0)}°)<br/>
                  Dispersion Factor: ${calculateDispersionFactor(windData.speed).toFixed(2)}x
                </div>
                ` : ''}
                
                ${recommendation ? `
                <div style="background-color: #dbeafe; padding: 8px; border-radius: 4px; font-size: 12px; color: #1e40af;">
                  <strong>Recommendation:</strong><br/>
                  ${recommendation}
                </div>
                ` : ''}
                
                <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                  <div style="font-size: 11px; color: #6b7280;">
                    <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Source:</strong>
                    <div style="display: flex; align-items: start; gap: 6px;">
                      <span style="color: #3b82f6;">📡</span>
                      <div>
                        <div style="font-weight: 600; color: #1f2937;">PurpleAir API</div>
                        <div style="margin-top: 2px;">Real-time PM2.5 data from community-operated sensors. Data calibrated using Barkjohn algorithm for humidity correction.</div>
                        <div style="margin-top: 4px; font-size: 10px; color: #9ca3af;">API: api.purpleair.com | Updated: Real-time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
            
            // Create and show popup with responsive width
            new mapboxgl.Popup({ closeOnClick: true, maxWidth: popupMaxWidthMapbox })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(map.current);
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'sensor-points', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'sensor-points', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    }
  }, [sensors, showSensors, smellClusters, windData, triFacilities, userHealthProfile, onSensorSelect]);

  // Add Title V facilities to map (VCAN requirement)
  useEffect(() => {
    if (!map.current || !showFacilities || facilities.length === 0) return;

    const facilitiesGeoJSON = {
      type: 'FeatureCollection' as const,
      features: facilities.map((facility) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [facility.location.lng, facility.location.lat],
        },
        properties: {
          id: facility.facilityId,
          name: facility.name,
          permitNumber: facility.permitNumber,
        },
      })),
    };

    const source = map.current.getSource('facilities') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(facilitiesGeoJSON);
    } else {
      map.current.addSource('facilities', {
        type: 'geojson',
        data: facilitiesGeoJSON,
      });

      // Add factory icon image if not already loaded
      const loadFactoryIcon = async () => {
        if (map.current && !map.current.hasImage('factory-icon')) {
          // Create a factory icon using emoji/symbol
          const size = 32;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw red circle background
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw white border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw factory emoji/text
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🏭', size / 2, size / 2);
          }
          // Convert canvas to ImageBitmap for Mapbox
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve);
          });
          if (blob && map.current) {
            const imageBitmap = await createImageBitmap(blob);
            if (map.current && !map.current.hasImage('factory-icon')) {
              map.current.addImage('factory-icon', imageBitmap);
            }
          }
        }
      };

      // Load icon and then add layer
      loadFactoryIcon().then(() => {
        if (map.current && map.current.hasImage('factory-icon')) {
          // Add facility layer with factory icon (matches legend)
          if (!map.current.getLayer('facility-points')) {
            map.current.addLayer({
              id: 'facility-points',
              type: 'symbol',
              source: 'facilities',
              minzoom: 11, // Visible at municipal level and below
              layout: {
                'icon-image': 'factory-icon',
                'icon-size': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  11, 0.5,  // Zoom 11: 0.5x size
                  12, 0.6,  // Zoom 12: 0.6x size
                  13, 0.7,  // Zoom 13: 0.7x size
                  14, 0.8,  // Zoom 14: 0.8x size
                  15, 1.0,  // Zoom 15+: 1.0x size (full size)
                ],
                'icon-allow-overlap': true,
                'icon-ignore-placement': false,
              },
            });
          }
        }
      });

      // Add facility labels (visible at zoom 14+ for hyperlocal view)
      map.current.addLayer({
        id: 'facility-labels',
        type: 'symbol',
        source: 'facilities',
        minzoom: 14, // Only show labels at hyperlocal zoom
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 10,
            15, 12,
          ],
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 2,
        },
      });

      // Add click handler for facilities with popup on map (VCAN requirement)
      map.current.on('click', 'facility-points', async (e) => {
        if (e.features && e.features[0] && e.lngLat && e.features[0].properties) {
          const props = e.features[0].properties;
          const facility = facilities.find((f) => f.facilityId === props.id);
          if (facility && map.current) {
            setSelectedFacility(facility);
            setSelectedSensor(null); // Clear sensor selection
            
            // Detect mobile screen size for responsive popup
            const isMobile = window.innerWidth < 640;
            const facilityPopupMinWidth = isMobile ? '220px' : '280px';
            const facilityPopupMaxWidth = isMobile ? '300px' : '400px';
            const facilityPopupMaxWidthMapbox = isMobile ? '300px' : '450px';
            
            // Create popup first with loading state
            const popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: facilityPopupMaxWidthMapbox })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="min-width: ${facilityPopupMinWidth}; max-width: ${facilityPopupMaxWidth};">
                  <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                    <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #dc2626; flex-shrink: 0; margin-top: 2px;"></div>
                    <div style="flex: 1;">
                      <h3 style="font-weight: bold; font-size: ${isMobile ? '14px' : '16px'}; margin: 0 0 4px 0; color: #1f2937;">${facility.name}</h3>
                      <p style="font-size: ${isMobile ? '11px' : '12px'}; color: #6b7280; margin: 0;">Title V Operating Permit Facility</p>
                    </div>
                  </div>
                  
                  ${facility.permitNumber ? `
                  <div style="margin-bottom: 8px; font-size: 13px;">
                    <strong style="color: #374151;">Permit ID:</strong> <span style="color: #1f2937;">${facility.permitNumber}</span>
                  </div>
                  ` : ''}
                  
                  <div style="margin-bottom: 8px; font-size: 13px;">
                    <strong style="color: #374151;">Location:</strong><br/>
                    <span style="color: #1f2937;">${facility.location.lat.toFixed(4)}, ${facility.location.lng.toFixed(4)}</span>
                  </div>
                  
                  <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 12px; font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                    Loading compliance data...
                  </div>
                  
                  <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                    <div style="font-size: 11px; color: #6b7280;">
                      <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Source:</strong>
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #dc2626;">🏛️</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">EPA ECHO API</div>
                          <div style="margin-top: 2px;">Compliance data from EPA's Enforcement and Compliance History Online (ECHO) system.</div>
                          <div style="margin-top: 4px; font-size: 10px; color: #9ca3af;">API: echo.epa.gov | Service: Detailed Facility Report (DFR)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `)
              .addTo(map.current);
            
            // Fetch compliance data asynchronously and update popup (VCAN requirement)
            const baseUrl = shouldUseEmulator()
              ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
              : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
            
            const apiUrl = `${baseUrl}/getFacilityCompliance`;
            console.log(`Fetching compliance data:`, {
              url: apiUrl,
              facilityId: facility.facilityId,
              usingEmulator: shouldUseEmulator(),
            });
            
            axios.get(apiUrl, {
              params: { facilityId: facility.facilityId },
              timeout: 15000, // Increased timeout
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .then((complianceResp) => {
              console.log('Compliance API response:', complianceResp.data);
              if (complianceResp.data?.success && complianceResp.data.compliance) {
                const complianceData = complianceResp.data.compliance;
                const complianceStatus = complianceData.status || 'Unknown';
                const isSNC = complianceData.isSNC || false;
                const violations = complianceData.violations || [];
                const quartersInNonCompliance = complianceData.quartersInNonCompliance || 0;
                const lastInspection = complianceData.lastInspectionDate;
                
                const statusColor = isSNC ? '#dc2626' : 
                                  complianceStatus === 'Non-Compliant' ? '#eab308' : 
                                  complianceStatus === 'Compliant' ? '#10b981' : '#6b7280';
                const statusBg = isSNC ? '#fee2e2' : 
                                complianceStatus === 'Non-Compliant' ? '#fef3c7' : 
                                complianceStatus === 'Compliant' ? '#d1fae5' : '#f3f4f6';
                
                const updatedPopupContent = `
                  <div style="min-width: 280px; max-width: 400px;">
                    <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                      <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #dc2626; flex-shrink: 0; margin-top: 2px;"></div>
                      <div style="flex: 1;">
                        <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 4px 0; color: #1f2937;">${facility.name}</h3>
                        <p style="font-size: 12px; color: #6b7280; margin: 0;">Title V Operating Permit Facility</p>
                      </div>
                    </div>
                    
                    ${facility.permitNumber ? `
                    <div style="margin-bottom: 8px; font-size: 13px;">
                      <strong style="color: #374151;">Permit ID:</strong> <span style="color: #1f2937;">${facility.permitNumber}</span>
                    </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 8px; font-size: 13px;">
                      <strong style="color: #374151;">Location:</strong><br/>
                      <span style="color: #1f2937;">${facility.location.lat.toFixed(4)}, ${facility.location.lng.toFixed(4)}</span>
                    </div>
                    
                    <div style="background-color: ${statusBg}; padding: 10px; border-radius: 6px; border-left: 4px solid ${statusColor}; margin-top: 12px;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <strong style="color: #374151;">Compliance Status:</strong>
                        <span style="background-color: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                          ${complianceStatus}${isSNC ? ' (SNC)' : ''}
                        </span>
                      </div>
                      
                      ${quartersInNonCompliance > 0 ? `
                      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                        <strong>Quarters in Non-Compliance:</strong> ${quartersInNonCompliance}
                      </div>
                      ` : ''}
                      
                      ${lastInspection ? `
                      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                        <strong>Last Inspection:</strong> ${new Date(lastInspection).toLocaleDateString()}
                      </div>
                      ` : ''}
                      
                      ${violations.length > 0 ? `
                      <div style="margin-top: 8px;">
                        <strong style="font-size: 12px; color: #374151; display: block; margin-bottom: 4px;">Recent Violations:</strong>
                        <ul style="margin: 0; padding-left: 20px; font-size: 11px; color: #6b7280;">
                          ${violations.slice(0, 3).map((v: any) => `
                            <li style="margin-bottom: 2px;">
                              ${new Date(v.date).toLocaleDateString()}: ${v.description}
                            </li>
                          `).join('')}
                        </ul>
                      </div>
                      ` : ''}
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                      <div style="font-size: 11px; color: #6b7280;">
                        <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Source:</strong>
                        <div style="display: flex; align-items: start; gap: 6px;">
                          <span style="color: #dc2626;">🏛️</span>
                          <div>
                            <div style="font-weight: 600; color: #1f2937;">EPA ECHO API</div>
                            <div style="margin-top: 2px;">Compliance data from EPA's Enforcement and Compliance History Online (ECHO) system. Includes three-year compliance status, quarters in non-compliance, and violation records.</div>
                            <div style="margin-top: 4px; font-size: 10px; color: #9ca3af;">API: echo.epa.gov | Service: Detailed Facility Report (DFR)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
                
                // Update popup with compliance data
                popup.setHTML(updatedPopupContent);
                setFacilityCompliance(complianceData);
              } else {
                // Show error if no compliance data
                const noDataContent = `
                  <div style="min-width: 280px; max-width: 400px;">
                    <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                      <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #dc2626; flex-shrink: 0; margin-top: 2px;"></div>
                      <div style="flex: 1;">
                        <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 4px 0; color: #1f2937;">${facility.name}</h3>
                        <p style="font-size: 12px; color: #6b7280; margin: 0;">Title V Operating Permit Facility</p>
                      </div>
                    </div>
                    
                    ${facility.permitNumber ? `
                    <div style="margin-bottom: 8px; font-size: 13px;">
                      <strong style="color: #374151;">Permit ID:</strong> <span style="color: #1f2937;">${facility.permitNumber}</span>
                    </div>
                    ` : ''}
                    
                  <div style="margin-bottom: 8px; font-size: 13px;">
                    <strong style="color: #374151;">Location:</strong><br/>
                    <span style="color: #1f2937;">${facility.location.lat.toFixed(4)}, ${facility.location.lng.toFixed(4)}</span>
                  </div>
                  
                  <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 12px; font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                    Unable to load compliance data. Please try again later.
                  </div>
                  
                  <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                    <div style="font-size: 11px; color: #6b7280;">
                      <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Source:</strong>
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #dc2626;">🏛️</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">EPA ECHO API</div>
                          <div style="margin-top: 2px;">Compliance data from EPA's Enforcement and Compliance History Online (ECHO) system.</div>
                          <div style="margin-top: 4px; font-size: 10px; color: #9ca3af;">API: echo.epa.gov | Service: Detailed Facility Report (DFR)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
                popup.setHTML(noDataContent);
              }
            })
            .catch((error: any) => {
              console.error('Error fetching compliance data:', error);
              console.error('Error details:', {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                status: error.response?.status,
                baseUrl,
                facilityId: facility.facilityId,
                usingEmulator: shouldUseEmulator(),
              });
              
              // Determine error message
              let errorMessage = 'Unknown error';
              if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. Please try again.';
              } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
                errorMessage = 'Network error. Please check if the Firebase emulator is running on port 5001.';
              } else if (error.response?.status === 404) {
                errorMessage = 'Compliance data not found for this facility.';
              } else if (error.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
              } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              // Update popup to show error
              const errorContent = `
                <div style="min-width: 280px; max-width: 400px;">
                  <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                    <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #dc2626; flex-shrink: 0; margin-top: 2px;"></div>
                    <div style="flex: 1;">
                      <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 4px 0; color: #1f2937;">${facility.name}</h3>
                      <p style="font-size: 12px; color: #6b7280; margin: 0;">Title V Operating Permit Facility</p>
                    </div>
                  </div>
                  
                  ${facility.permitNumber ? `
                  <div style="margin-bottom: 8px; font-size: 13px;">
                    <strong style="color: #374151;">Permit ID:</strong> <span style="color: #1f2937;">${facility.permitNumber}</span>
                  </div>
                  ` : ''}
                  
                  <div style="margin-bottom: 8px; font-size: 13px;">
                    <strong style="color: #374151;">Location:</strong><br/>
                    <span style="color: #1f2937;">${facility.location.lat.toFixed(4)}, ${facility.location.lng.toFixed(4)}</span>
                  </div>
                  
                  <div style="background-color: #fee2e2; padding: 8px; border-radius: 4px; margin-top: 12px; font-size: 12px; color: #dc2626; border-left: 4px solid #dc2626; margin-bottom: 12px;">
                    <strong>Error:</strong> ${errorMessage}
                    ${shouldUseEmulator() ? '<br/><small style="color: #991b1b; margin-top: 4px; display: block;">Make sure Firebase emulators are running: <code>firebase emulators:start</code></small>' : ''}
                  </div>
                  
                  <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                    <div style="font-size: 11px; color: #6b7280;">
                      <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Source:</strong>
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #dc2626;">🏛️</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">EPA ECHO API</div>
                          <div style="margin-top: 2px;">Compliance data from EPA's Enforcement and Compliance History Online (ECHO) system.</div>
                          <div style="margin-top: 4px; font-size: 10px; color: #9ca3af;">API: echo.epa.gov | Service: Detailed Facility Report (DFR)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              popup.setHTML(errorContent);
            });
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'facility-points', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });
      map.current.on('mouseleave', 'facility-points', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    }
  }, [map.current, facilities, showFacilities]);

  // Add pollution plumes from facilities in wind direction (VCAN requirement)
  useEffect(() => {
    if (!map.current || !showFacilities || facilities.length === 0 || !windData) {
      // Hide plumes if conditions not met
      if (map.current && map.current.getLayer('facility-plumes-fill')) {
        map.current.setLayoutProperty('facility-plumes-fill', 'visibility', 'none');
        map.current.setLayoutProperty('facility-plumes-outline', 'visibility', 'none');
      }
      return;
    }

    // Create plume polygons extending from each facility in wind direction
    const createPlumePolygon = (facility: TitleVFacility, windDir: number, windSpeed: number) => {
      // Convert wind direction (meteorological: direction wind comes FROM) to bearing (direction wind goes TO)
      const bearing = (windDir + 180) % 360; // Wind blows TO this direction
      
      // Plume length based on wind speed (faster wind = longer plume)
      // Base length: 0.01 degrees (~1km), scaled by wind speed
      const baseLength = 0.01;
      const speedMultiplier = Math.min(windSpeed / 5, 2); // Cap at 2x for very high winds
      const plumeLength = baseLength * (1 + speedMultiplier);
      
      // Plume width (wider at base, narrower at tip)
      const baseWidth = 0.003; // ~300m
      const tipWidth = 0.001;  // ~100m
      
      // Calculate plume end point
      const start = turf.point([facility.location.lng, facility.location.lat]);
      const end = turf.destination(start, plumeLength, bearing, { units: 'degrees' });
      
      // Create a tapered plume polygon (fan shape)
      const leftOffset = turf.destination(start, baseWidth, bearing - 45, { units: 'degrees' });
      const rightOffset = turf.destination(start, baseWidth, bearing + 45, { units: 'degrees' });
      const tipLeft = turf.destination(end, tipWidth, bearing - 20, { units: 'degrees' });
      const tipRight = turf.destination(end, tipWidth, bearing + 20, { units: 'degrees' });
      
      return turf.polygon([[
        [leftOffset.geometry.coordinates[0], leftOffset.geometry.coordinates[1]],
        [rightOffset.geometry.coordinates[0], rightOffset.geometry.coordinates[1]],
        [tipRight.geometry.coordinates[0], tipRight.geometry.coordinates[1]],
        [tipLeft.geometry.coordinates[0], tipLeft.geometry.coordinates[1]],
        [leftOffset.geometry.coordinates[0], leftOffset.geometry.coordinates[1]],
      ]]);
    };

    const plumesGeoJSON = {
      type: 'FeatureCollection' as const,
      features: facilities.map((facility) => ({
        type: 'Feature' as const,
        geometry: createPlumePolygon(facility, windData.direction, windData.speed).geometry,
        properties: {
          facilityId: facility.facilityId,
          facilityName: facility.name,
        },
      })),
    };

    const source = map.current.getSource('facility-plumes') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(plumesGeoJSON);
      if (map.current.getLayer('facility-plumes-fill')) {
        map.current.setLayoutProperty('facility-plumes-fill', 'visibility', 'visible');
        map.current.setLayoutProperty('facility-plumes-outline', 'visibility', 'visible');
      }
    } else {
      map.current.addSource('facility-plumes', {
        type: 'geojson',
        data: plumesGeoJSON,
      });

      // Add plume fill layer (semi-transparent)
      map.current.addLayer({
        id: 'facility-plumes-fill',
        type: 'fill',
        source: 'facility-plumes',
        minzoom: 11,
        paint: {
          'fill-color': '#ff6b6b', // Red-orange for pollution
          'fill-opacity': 0.15, // Very transparent
        },
      });

      // Add plume outline
      map.current.addLayer({
        id: 'facility-plumes-outline',
        type: 'line',
        source: 'facility-plumes',
        minzoom: 11,
        paint: {
          'line-color': '#ff6b6b',
          'line-width': 1.5,
          'line-opacity': 0.4,
          'line-dasharray': [2, 2], // Dashed line
        },
      });

      // Add click handler for facility plumes with popup
      map.current.on('click', 'facility-plumes-fill', (e) => {
        if (e.features && e.features[0] && e.lngLat && e.features[0].properties) {
          const props = e.features[0].properties;
          const facility = facilities.find((f) => f.facilityId === props.facilityId);
          
          if (facility && map.current && windData) {
            // Calculate plume direction (where pollution travels TO)
            const bearing = (windData.direction + 180) % 360; // Wind blows TO this direction
            const plumeDirection = degreesToCompass(bearing);
            
            // Detect mobile screen size for responsive popup
            const isMobile = window.innerWidth < 640;
            const plumePopupMinWidth = isMobile ? '220px' : '280px';
            const plumePopupMaxWidth = isMobile ? '300px' : '400px';
            const plumePopupMaxWidthMapbox = isMobile ? '300px' : '450px';
            
            const popupContent = `
              <div style="min-width: ${plumePopupMinWidth}; max-width: ${plumePopupMaxWidth};">
                <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 16px; height: 16px; border-radius: 4px; background-color: #ff6b6b; flex-shrink: 0; margin-top: 2px;"></div>
                  <div style="flex: 1;">
                    <h3 style="font-weight: bold; font-size: ${isMobile ? '14px' : '16px'}; margin: 0 0 4px 0; color: #1f2937;">${facility.name}</h3>
                    <p style="font-size: ${isMobile ? '11px' : '12px'}; color: #6b7280; margin: 0;">Pollution Plume</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Plume Direction:</strong><br/>
                  <span style="color: #1f2937; font-weight: 600;">${plumeDirection} (${bearing.toFixed(0)}°)</span>
                  <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">Pollution traveling ${plumeDirection.toLowerCase()} from this facility</p>
                </div>
                
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Wind Conditions:</strong><br/>
                  <div style="margin-top: 4px;">
                    <div>Speed: <span style="color: #1f2937;">${windData.speed.toFixed(1)} m/s</span></div>
                    <div>Direction: <span style="color: #1f2937;">${degreesToCompass(windData.direction)} (${windData.direction.toFixed(0)}°)</span></div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Dispersion: ${calculateDispersionFactor(windData.speed).toFixed(2)}x</div>
                  </div>
                </div>
                
                <div style="background-color: #fef3c7; padding: 8px; border-radius: 4px; font-size: 12px; color: #92400e; border-left: 4px solid #f59e0b; margin-bottom: 12px;">
                  <strong>Note:</strong> This plume shows where pollution from this facility is likely traveling based on current wind conditions. Plume length and direction update dynamically with wind changes.
                </div>
                
                <div style="background-color: #eff6ff; padding: 8px; border-radius: 4px; font-size: 12px; color: #1e40af; border-left: 3px solid #3b82f6; margin-bottom: 12px;">
                  💡 <strong>Tip:</strong> Click the facility icon (${facility.name}) for full facility details, compliance status, and permit information.
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                  <div style="font-size: 11px; color: #6b7280;">
                    <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Sources:</strong>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #dc2626;">🏭</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">Facility Location</div>
                          <div style="margin-top: 2px; font-size: 10px;">EPA ECHO API - Title V Operating Permit Facilities</div>
                        </div>
                      </div>
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #10b981;">🌬️</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">Wind Data</div>
                          <div style="margin-top: 2px; font-size: 10px;">OpenWeatherMap API for real-time wind speed and direction</div>
                        </div>
                      </div>
                      <div style="margin-top: 4px; font-size: 10px; color: #9ca3af; font-style: italic;">
                        Plume visualization calculated using dispersion modeling based on wind speed and direction.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
            
            // Create and show popup
            new mapboxgl.Popup({ closeOnClick: true, maxWidth: plumePopupMaxWidthMapbox })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(map.current);
          }
        }
      });

      // Change cursor on hover for plumes
      map.current.on('mouseenter', 'facility-plumes-fill', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });
      map.current.on('mouseleave', 'facility-plumes-fill', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    }
  }, [map.current, showFacilities, facilities, windData]);

  // Add Smell PGH clusters to map (VCAN requirement)
  useEffect(() => {
    if (!map.current) return;
    
    if (!showSmellReports) {
      // Hide layer if disabled
      if (map.current.getLayer('smell-clusters')) {
        map.current.setLayoutProperty('smell-clusters', 'visibility', 'none');
      }
      return;
    }
    
    // Show layer if enabled but no data yet
    if (smellClusters.length === 0) {
      // Remove existing layer if present
      if (map.current.getLayer('smell-clusters')) {
        map.current.removeLayer('smell-clusters');
      }
      if (map.current.getSource('smell-reports')) {
        map.current.removeSource('smell-reports');
      }
      return;
    }

    const smellGeoJSON = {
      type: 'FeatureCollection' as const,
      features: smellClusters.map((cluster) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [cluster.center.lng, cluster.center.lat],
        },
        properties: {
          id: `smell-${cluster.center.lat}-${cluster.center.lng}`,
          averageSmell: cluster.averageSmell,
          clusterSize: cluster.clusterSize,
          odorWeight: cluster.odorWeight,
        },
      })),
    };

    const source = map.current.getSource('smell-reports') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(smellGeoJSON);
      // Ensure layer is visible
      if (map.current.getLayer('smell-clusters')) {
        map.current.setLayoutProperty('smell-clusters', 'visibility', 'visible');
      }
    } else {
      map.current.addSource('smell-reports', {
        type: 'geojson',
        data: smellGeoJSON,
      });

      // Create triangle/pyramid icons for Smell PGH (visual distinction from PurpleAir circles)
      const createTriangleIcon = async (color: string, size: number = 20): Promise<ImageBitmap | null> => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        // Draw triangle pointing up (pyramid shape)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(size / 2, 2); // Top point
        ctx.lineTo(size - 2, size - 2); // Bottom right
        ctx.lineTo(2, size - 2); // Bottom left
        ctx.closePath();
        ctx.fill();
        
        // Add white border for visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve);
        });
        if (blob) {
          return await createImageBitmap(blob);
        }
        return null;
      };

      // Load triangle icons for different smell levels
      const loadSmellIcons = async () => {
        if (!map.current) return;
        
        const colors = {
          low: '#90EE90',      // Light green
          moderate: '#FFD700',  // Gold
          high: '#FF8C00',      // Dark orange
          veryHigh: '#DC143C',  // Crimson
        };
        
        for (const [level, color] of Object.entries(colors)) {
          const iconName = `smell-triangle-${level}`;
          if (!map.current.hasImage(iconName)) {
            const icon = await createTriangleIcon(color, 20);
            if (icon && map.current) {
              map.current.addImage(iconName, icon);
            }
          }
        }
      };

      // Load icons and then add layer
      loadSmellIcons().then(() => {
        if (!map.current) return;
        
        if (map.current.getLayer('smell-clusters')) {
          return; // Layer already exists
        }

        map.current.addLayer({
        id: 'smell-clusters',
        type: 'symbol',
        source: 'smell-reports',
        minzoom: 10, // Lower zoom level to show earlier
        layout: {
          'icon-image': [
            'step',
            ['get', 'averageSmell'],
            'smell-triangle-low',      // 1-2: Low
            2,
            'smell-triangle-moderate', // 2-3: Moderate
            3,
            'smell-triangle-high',     // 3-4: High
            4,
            'smell-triangle-veryHigh', // 4-5: Very High
          ],
          'icon-size': [
            'interpolate',
            ['linear'],
            ['get', 'clusterSize'],
            3, 0.6,
            10, 1.0,
            20, 1.4,
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': false,
        },
        });
      });

      // Add click handler for smell clusters with popup on map
      map.current.on('click', 'smell-clusters', (e) => {
        if (e.features && e.features[0] && e.lngLat && e.features[0].properties) {
          const props = e.features[0].properties;
          const cluster = smellClusters.find((c) => 
            `smell-${c.center.lat}-${c.center.lng}` === props.id
          );
          
          if (cluster && map.current) {
            const avgSmell = cluster.averageSmell;
            const smellLevel = avgSmell < 2 ? 'Low' :
                              avgSmell < 3 ? 'Moderate' :
                              avgSmell < 4 ? 'High' : 'Very High';
            const smellColor = avgSmell < 2 ? '#90EE90' :
                              avgSmell < 3 ? '#FFD700' :
                              avgSmell < 4 ? '#FF8C00' : '#DC143C';
            
            // Detect mobile screen size for responsive popup
            const isMobileSmell = window.innerWidth < 640;
            const smellPopupMinWidth = isMobileSmell ? '220px' : '250px';
            const smellPopupMaxWidth = isMobileSmell ? '300px' : '350px';
            const smellPopupMaxWidthMapbox = isMobileSmell ? '300px' : '400px';
            
            const popupContent = `
              <div style="min-width: ${smellPopupMinWidth}; max-width: ${smellPopupMaxWidth};">
                <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${smellColor}; flex-shrink: 0; margin-top: 4px;"></div>
                  <div style="flex: 1;">
                    <h3 style="font-weight: bold; font-size: ${isMobileSmell ? '14px' : '16px'}; margin: 0 0 4px 0; color: #1f2937;">Smell Report Cluster</h3>
                    <p style="font-size: ${isMobileSmell ? '11px' : '12px'}; color: #6b7280; margin: 0;">Crowdsourced Odor Reports</p>
                  </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 13px;">
                  <div>
                    <strong style="color: #374151;">Smell Level:</strong><br/>
                    <span style="color: ${smellColor}; font-weight: 600;">${smellLevel}</span>
                  </div>
                  <div>
                    <strong style="color: #374151;">Reports:</strong><br/>
                    <span style="color: #1f2937;">${cluster.clusterSize} reports</span>
                  </div>
                </div>
                
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Average Smell Value:</strong><br/>
                  <span style="color: #1f2937; font-weight: 600;">${avgSmell.toFixed(1)} / 5.0</span>
                </div>
                
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Odor Weight (W_odor):</strong><br/>
                  <span style="color: #1f2937; font-weight: 600;">${cluster.odorWeight.toFixed(2)}</span>
                </div>
                
                <div style="background-color: #fef3c7; padding: 8px; border-radius: 4px; font-size: 12px; color: #92400e; border-left: 4px solid #f59e0b; margin-bottom: 12px;">
                  <strong>Note:</strong> High smell values (4-5) may indicate H2S or SO2 emissions, even if PM2.5 levels appear normal.
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                  <div style="font-size: 11px; color: #6b7280;">
                    <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Source:</strong>
                    <div style="display: flex; align-items: start; gap: 6px;">
                      <span style="color: #8b5cf6;">👃</span>
                      <div>
                        <div style="font-weight: 600; color: #1f2937;">Smell PGH API</div>
                        <div style="margin-top: 2px;">Crowdsourced odor reports from CMU Create Lab's Smell PGH platform. Reports aggregated and clustered to identify odor events.</div>
                        <div style="margin-top: 4px; font-size: 10px; color: #9ca3af;">API: api.smellpittsburgh.org | Source: CMU Create Lab</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
            
            // Create and show popup with responsive width
            new mapboxgl.Popup({ closeOnClick: true, maxWidth: smellPopupMaxWidthMapbox })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(map.current);
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'smell-clusters', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'smell-clusters', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    }
  }, [map.current, smellClusters, showSmellReports]);

  // Add risk zones to map (VCAN requirement)
  useEffect(() => {
    if (!map.current) return;
    
    if (!showRiskZones) {
      // Hide layer if disabled
      if (map.current.getLayer('risk-zones-fill')) {
        map.current.setLayoutProperty('risk-zones-fill', 'visibility', 'none');
        map.current.setLayoutProperty('risk-zones-outline', 'visibility', 'none');
      }
      return;
    }
    
    // Show layer if enabled but no data yet
    if (riskZones.length === 0) {
      // Remove existing layers FIRST before removing source
      // Order matters: layers must be removed before source
      if (map.current.getLayer('risk-zones-fill')) {
        map.current.removeLayer('risk-zones-fill');
      }
      if (map.current.getLayer('risk-zones-outline')) {
        map.current.removeLayer('risk-zones-outline');
      }
      // Now safe to remove source after layers are removed
      if (map.current.getSource('risk-zones')) {
        map.current.removeSource('risk-zones');
      }
      return;
    }

    // Create GeoJSON with all zones (including hidden ones for click detection)
    // Hidden zones will have opacity 0 but still be clickable
    const zonesGeoJSON = {
      type: 'FeatureCollection' as const,
      features: riskZones.map((zone, idx) => ({
        type: 'Feature' as const,
        geometry: zone.polygon.geometry,
        properties: {
          id: `risk-zone-${idx}`,
          riskLevel: zone.riskLevel,
          affectedArea: zone.affectedArea,
          hidden: hiddenRiskZones.has(`risk-zone-${idx}`) ? true : false, // Mark hidden zones (explicit boolean)
        },
      })),
    };

    const source = map.current.getSource('risk-zones') as mapboxgl.GeoJSONSource;
    if (source) {
      // Source exists, update data
      source.setData(zonesGeoJSON);
      
      // Ensure layers exist and are visible
      if (!map.current.getLayer('risk-zones-fill')) {
        map.current.addLayer({
          id: 'risk-zones-fill',
          type: 'fill',
          source: 'risk-zones',
          paint: {
            'fill-color': [
              'match',
              ['get', 'riskLevel'],
              'elevated', '#ffff00', // Yellow
              'high', '#ff7e00', // Orange
              'severe', '#ff0000', // Red
              'toxic', '#9c27b0', // Purple
              '#cccccc', // Default gray
            ],
            // Zoom must be top-level, so we multiply zoom-based opacity by hidden check
            'fill-opacity': [
              '*',
              [
                'case',
                ['to-boolean', ['get', 'hidden']], 0, 1
              ],
              [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 0.55,
                12, 0.52,
                15, 0.50,
              ],
            ],
          },
        });
      } else {
        // Layer exists, ensure it's visible
        map.current.setLayoutProperty('risk-zones-fill', 'visibility', 'visible');
      }
      
      if (!map.current.getLayer('risk-zones-outline')) {
        map.current.addLayer({
          id: 'risk-zones-outline',
          type: 'line',
          source: 'risk-zones',
          paint: {
            'line-color': [
              'match',
              ['get', 'riskLevel'],
              'elevated', '#ffff00',
              'high', '#ff7e00',
              'severe', '#ff0000',
              'toxic', '#9c27b0',
              '#cccccc',
            ],
            'line-width': 2.5,
            'line-opacity': 0.8,
          },
        });
      } else {
        // Layer exists, ensure it's visible
        map.current.setLayoutProperty('risk-zones-outline', 'visibility', 'visible');
      }
      
      console.log('✅ Risk zones updated:', riskZones.length, 'zones');
    } else {
      // Source doesn't exist, create it and layers
      map.current.addSource('risk-zones', {
        type: 'geojson',
        data: zonesGeoJSON,
      });

      map.current.addLayer({
        id: 'risk-zones-fill',
        type: 'fill',
        source: 'risk-zones',
        paint: {
          'fill-color': [
            'match',
            ['get', 'riskLevel'],
            'elevated', '#ffff00', // Yellow
            'high', '#ff7e00', // Orange
            'severe', '#ff0000', // Red
            'toxic', '#9c27b0', // Purple
            '#cccccc', // Default gray
          ],
          // Zoom-based opacity: starts at 0.55 at low zoom, decreases to 0.50 when zoomed in
          // More visible colors while still maintaining transparency
          // Hidden zones have opacity 0 but remain clickable
          // Zoom must be top-level, so we multiply zoom-based opacity by hidden check
          'fill-opacity': [
            '*',
            [
              'case',
              ['to-boolean', ['get', 'hidden']], 0, 1 // 0 if hidden, 1 if visible
            ],
            [
              'interpolate',
              ['linear'],
              ['zoom'],
              8, 0.55,  // Start at 0.55 at low zoom (more colorfully visible)
              12, 0.52, // Decrease to 0.52 at medium zoom
              15, 0.50, // Decrease to 0.50 when zoomed in (still colorfully visible)
            ],
          ],
        },
      });

      map.current.addLayer({
        id: 'risk-zones-outline',
        type: 'line',
        source: 'risk-zones',
        paint: {
          'line-color': [
            'match',
            ['get', 'riskLevel'],
            'elevated', '#ffff00',
            'high', '#ff7e00',
            'severe', '#ff0000',
            'toxic', '#9c27b0',
            '#cccccc',
          ],
          'line-width': 2.5,
          'line-opacity': 0.8,
        },
      });
      
      console.log('✅ Risk zones created:', riskZones.length, 'zones');
    }

    // Always ensure click handlers are attached (even if source already exists)
    // Store handler reference to allow removal
    const riskZoneClickHandler = (e: mapboxgl.MapLayerMouseEvent | mapboxgl.MapMouseEvent) => {
      // Get all features at the click point, including risk zones
      if (!map.current || !e.lngLat) {
        return; // Silently ignore if map or coordinates missing
      }
      
      // Check if risk zone layers exist before querying
      const fillLayerExists = map.current.getLayer('risk-zones-fill');
      const outlineLayerExists = map.current.getLayer('risk-zones-outline');
      
      if (!fillLayerExists && !outlineLayerExists) {
        // Layers don't exist yet, ignore click
        return;
      }
      
      // Ensure we have a point (pixel coordinates)
      const point = e.point || (e as any).point;
      if (!point) {
        return; // Silently ignore if point missing
      }
      
      // Use point-in-polygon check instead of queryRenderedFeatures
      // This is more reliable for fill layers
      try {
        // Convert click coordinates to turf point
        const clickPoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
        
        // Check each risk zone to see if the click point is inside
        let clickedZone: RiskZone | null = null;
        let clickedZoneIndex = -1;
        
        for (let i = 0; i < riskZones.length; i++) {
          const zone = riskZones[i];
          // Skip hidden zones (they're still clickable but we'll handle them)
          const zoneId = `risk-zone-${i}`;
          if (hiddenRiskZones.has(zoneId)) {
            continue; // Skip hidden zones for now
          }
          
          // Check if point is inside polygon
          if (turf.booleanPointInPolygon(clickPoint, zone.polygon)) {
            clickedZone = zone;
            clickedZoneIndex = i;
            break; // Found the zone, stop searching
          }
        }
        
        console.log('🔵 Point-in-polygon check:', {
          clickPoint: [e.lngLat.lng, e.lngLat.lat],
          zonesChecked: riskZones.length,
          zoneFound: clickedZone !== null,
          zoneIndex: clickedZoneIndex
        });
        
        if (!clickedZone || clickedZoneIndex === -1) {
          // No risk zone clicked, ignore
          return;
        }
        
        console.log('✅ Risk zone clicked! Zone index:', clickedZoneIndex);
        
        const zoneId = `risk-zone-${clickedZoneIndex}`;
        const zone = clickedZone;
        
        // Check if zone is currently hidden (before toggle)
        const isCurrentlyHidden = hiddenRiskZones.has(zoneId);
        
        // Toggle zone visibility on click (hide/show)
        setHiddenRiskZones((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(zoneId)) {
            newSet.delete(zoneId); // Show zone
          } else {
            newSet.add(zoneId); // Hide zone
          }
          return newSet;
        });
        
        if (zone && map.current) {
        const riskLevel = zone.riskLevel;
        const riskColor = riskLevel === 'elevated' ? '#ffff00' :
                        riskLevel === 'high' ? '#ff7e00' :
                        riskLevel === 'severe' ? '#ff0000' :
                        riskLevel === 'toxic' ? '#9c27b0' : '#cccccc';
        
        const riskLabel = riskLevel === 'elevated' ? 'Elevated Risk' :
                        riskLevel === 'high' ? 'High Risk' :
                        riskLevel === 'severe' ? 'Severe Risk' :
                        riskLevel === 'toxic' ? 'Toxic Event' : 'Risk Zone';
        
        const recommendation = riskLevel === 'elevated' 
          ? 'Sensitive individuals should have medications ready. General public can enjoy outdoor activities.'
          : riskLevel === 'high'
          ? 'Sensitive individuals should shelter in place. General public should limit outdoor exertion.'
          : riskLevel === 'severe'
          ? 'All users should shelter in place. Check window seals and activate air purifiers.'
          : riskLevel === 'toxic'
          ? 'IMMEDIATE ALERT: Likely industrial upset event. Consider evacuating if symptoms worsen.'
          : 'Monitor air quality conditions.';
        
        // Detect mobile screen size for responsive popup
        const isMobile = window.innerWidth < 640;
        const riskPopupMinWidth = isMobile ? '220px' : '280px';
        const riskPopupMaxWidth = isMobile ? '300px' : '400px';
        const riskPopupMaxWidthMapbox = isMobile ? '300px' : '450px';
        
        const popupContent = `
              <div style="min-width: ${riskPopupMinWidth}; max-width: ${riskPopupMaxWidth};">
                <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 16px; height: 16px; border-radius: 4px; background-color: ${riskColor}; flex-shrink: 0; margin-top: 2px;"></div>
                  <div style="flex: 1;">
                    <h3 style="font-weight: bold; font-size: ${isMobile ? '14px' : '16px'}; margin: 0 0 4px 0; color: #1f2937;">${riskLabel}</h3>
                    <p style="font-size: ${isMobile ? '11px' : '12px'}; color: #6b7280; margin: 0;">Dynamic Risk Zone</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Risk Level:</strong><br/>
                  <span style="color: #1f2937; font-weight: 600; text-transform: capitalize;">${riskLevel}</span>
                </div>
                
                ${zone.affectedArea ? `
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Affected Area:</strong><br/>
                  <span style="color: #1f2937;">${(zone.affectedArea * 0.386102).toFixed(2)} mi²</span>
                </div>
                ` : ''}
                
                <div style="background-color: ${riskLevel === 'toxic' ? '#fee2e2' : riskLevel === 'severe' ? '#fee2e2' : '#dbeafe'}; padding: 10px; border-radius: 6px; border-left: 4px solid ${riskColor}; font-size: 12px; color: ${riskLevel === 'toxic' || riskLevel === 'severe' ? '#991b1b' : '#1e40af'};">
                  <strong>Recommendation:</strong><br/>
                  ${recommendation}
                </div>
                
                <div style="margin-top: 12px; padding: 8px; background-color: #f9fafb; border-radius: 4px; font-size: 11px; color: #6b7280; margin-bottom: 12px;">
                  <strong>Note:</strong> This zone is dynamically generated based on pollution events, sensor readings, and wind patterns. Risk zones update in real-time.
                </div>
                
                <div style="margin-bottom: 12px; padding: 8px; background-color: #eff6ff; border-radius: 6px; font-size: 12px; color: #1e40af; border-left: 3px solid #3b82f6;">
                  💡 <strong>Tip:</strong> ${isCurrentlyHidden 
                    ? 'This zone is currently hidden. Click this zone again to show it.' 
                    : 'Click this zone again to hide it for a clearer map view. You can click it again to show it.'}
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                  <div style="font-size: 11px; color: #6b7280;">
                    <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Sources:</strong>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #3b82f6;">📡</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">PurpleAir Sensors</div>
                          <div style="margin-top: 2px; font-size: 10px;">PM2.5 readings with Barkjohn calibration</div>
                        </div>
                      </div>
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #8b5cf6;">👃</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">Smell PGH Reports</div>
                          <div style="margin-top: 2px; font-size: 10px;">Crowdsourced odor reports (CMU Create Lab)</div>
                        </div>
                      </div>
                      <div style="display: flex; align-items: start; gap: 6px;">
                        <span style="color: #10b981;">🌬️</span>
                        <div>
                          <div style="font-weight: 600; color: #1f2937;">Wind Data</div>
                          <div style="margin-top: 2px; font-size: 10px;">OpenWeatherMap API for dispersion modeling</div>
                        </div>
                      </div>
                      <div style="margin-top: 4px; font-size: 10px; color: #9ca3af; font-style: italic;">
                        Risk zones calculated using weighted risk algorithm with toxicity weights from EPA TRI data.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
        
        // Create and show popup with responsive width
          new mapboxgl.Popup({ closeOnClick: true, maxWidth: riskPopupMaxWidthMapbox })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current);
        }
      } catch (error: any) {
        console.error('❌ Error in risk zone click handler:', error.message);
        return;
      }
    };
    
    // Store handler in ref for cleanup
    riskZoneClickHandlerRef.current = riskZoneClickHandler;
    
    // Attach a general map click handler that checks for risk zones
    // This approach is more reliable than layer-specific handlers
    const attachMapClickHandler = () => {
      if (!map.current) return;
      
      // Remove previous handler if it exists
      const previousHandler = riskZoneClickHandlerRef.current;
      if (previousHandler) {
        try {
          map.current.off('click', previousHandler);
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Attach handler to the map itself (not specific layers)
      // This will catch clicks on risk zones even if other layers are on top
      map.current.on('click', riskZoneClickHandler);
      console.log('✅ Risk zone map click handler attached');
    };
    
    // Attach handler when map is ready
    if (map.current.loaded()) {
      attachMapClickHandler();
    } else {
      map.current.once('load', () => {
        setTimeout(attachMapClickHandler, 100);
      });
    }
    
    // Also attach after delays to ensure it's set up
    const timeoutId1 = setTimeout(attachMapClickHandler, 100);
    const timeoutId2 = setTimeout(attachMapClickHandler, 500);
    
    // Cleanup function
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      if (map.current && riskZoneClickHandlerRef.current) {
        try {
          map.current.off('click', riskZoneClickHandlerRef.current);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [riskZones, showRiskZones, hiddenRiskZones]);

  // Change cursor on hover for risk zones
  useEffect(() => {
    if (!map.current || !showRiskZones) return;
    
    const handleMouseEnter = () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    };
    
    const handleMouseLeave = () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    };

    map.current.on('mouseenter', 'risk-zones-fill', handleMouseEnter);
    map.current.on('mouseleave', 'risk-zones-fill', handleMouseLeave);

    return () => {
      if (map.current) {
        map.current.off('mouseenter', 'risk-zones-fill', handleMouseEnter);
        map.current.off('mouseleave', 'risk-zones-fill', handleMouseLeave);
      }
    };
  }, [map.current, showRiskZones]);

  // Add VCAN distribution locations to map
  useEffect(() => {
    if (!map.current) return;
    
    // Don't load layer if checkbox is not checked OR if locations haven't loaded yet
    if (!showVCANDistribution) {
      // Hide layer if disabled
      if (map.current.getLayer('vcan-distribution')) {
        map.current.setLayoutProperty('vcan-distribution', 'visibility', 'none');
      }
      return;
    }
    
    // Wait for locations to load before showing layer
    if (vcanLocations.length === 0) {
      return;
    }

    // Create GeoJSON for VCAN locations
    const vcanGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: vcanLocations
        .filter(loc => loc.location && loc.location.lat && loc.location.lng)
        .map(loc => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [loc.location!.lng, loc.location!.lat],
          },
          properties: {
            id: loc.id,
            address: loc.address,
            city: loc.city,
            zipCode: loc.zipCode,
            deviceType: loc.deviceType,
          },
        })),
    };

    // Create proper green heart icon using SVG (classic heart shape - matches emoji)
    const createGreenHeartIcon = async (): Promise<ImageBitmap | null> => {
      const size = 24; // Compact size for better appearance
      
      // Classic heart path that matches the ❤️ emoji shape
      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12,21.35l-1.45-1.32C5.4,15.36 2,12.28 2,8.5 2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3 19.58,3 22,5.42 22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z" 
                fill="#22c55e" 
                stroke="#ffffff" 
                stroke-width="0.8"/>
        </svg>
      `;
      
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, size, size);
            createImageBitmap(canvas).then(resolve).catch(() => resolve(null));
          } else {
            resolve(null);
          }
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    };

    // Load icon and add layer
    const loadVCANLayer = async () => {
      if (!map.current) return;
      
      console.log(`🔄 Loading VCAN layer with ${vcanGeoJSON.features.length} locations`);
      
      const iconName = 'vcan-heart-green';
      if (!map.current.hasImage(iconName)) {
        console.log('🎨 Creating green heart icon...');
        const icon = await createGreenHeartIcon();
        if (icon && map.current) {
          map.current.addImage(iconName, icon);
          console.log('✅ Green heart icon created and added to map');
        } else {
          console.error('❌ Failed to create green heart icon');
        }
      } else {
        console.log('✅ Green heart icon already exists');
      }

      if (map.current.getSource('vcan-distribution')) {
        // Update existing source
        console.log('🔄 Updating existing VCAN distribution source');
        const source = map.current.getSource('vcan-distribution') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(vcanGeoJSON);
        }
        
        // Show layer if it exists
        if (map.current.getLayer('vcan-distribution')) {
          map.current.setLayoutProperty('vcan-distribution', 'visibility', 'visible');
          console.log('✅ VCAN distribution layer is visible');
        } else {
          console.warn('⚠️ VCAN distribution layer does not exist, will create it');
        }
      } else {
        // Add new source and layer
        console.log('➕ Adding new VCAN distribution source and layer');
        map.current.addSource('vcan-distribution', {
          type: 'geojson',
          data: vcanGeoJSON,
        });

        map.current.addLayer({
          id: 'vcan-distribution',
          type: 'symbol',
          source: 'vcan-distribution',
          layout: {
            'icon-image': 'vcan-heart-green',
            'icon-size': 1.1, // Good size for visibility
            'icon-allow-overlap': true,
            'icon-ignore-placement': false,
          },
        });
        console.log('✅ VCAN distribution layer added to map');
      }

      // Add click handler for VCAN locations
      const vcanClickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
        if (e.features && e.features[0] && e.lngLat && e.features[0].properties) {
          const props = e.features[0].properties;
          const deviceType = props.deviceType as string;
          const address = props.address as string;
          const city = props.city as string;
          const zipCode = props.zipCode as string;
          
          const isMobile = window.innerWidth < 640;
          const popupMinWidth = isMobile ? '220px' : '280px';
          const popupMaxWidth = isMobile ? '300px' : '400px';
          const popupMaxWidthMapbox = isMobile ? '300px' : '400px';

          const deviceTypeLabel = deviceType === 'filter' ? 'Air Filter' : 'Air Purifier';
          const deviceIcon = deviceType === 'filter' ? '🔧' : '💨';
          const deviceDescription = deviceType === 'filter' 
            ? 'Air Filter - Helps reduce indoor air pollution particles by filtering the air'
            : 'Air Purifier - Advanced filtration system that actively cleans indoor air';
          
          const popupContent = `
            <div style="min-width: ${popupMinWidth}; max-width: ${popupMaxWidth};">
              <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                  <span style="color: #22c55e; font-size: 20px;">❤️</span>
                </div>
                <div style="flex: 1;">
                  <h3 style="font-weight: bold; font-size: ${isMobile ? '15px' : '17px'}; margin: 0 0 4px 0; color: #1f2937;">VCAN Distribution</h3>
                  <p style="font-size: ${isMobile ? '12px' : '13px'}; color: #6b7280; margin: 0; font-weight: 500;">${deviceIcon} ${deviceTypeLabel} Location</p>
                </div>
              </div>
              
              <div style="background-color: ${deviceType === 'filter' ? '#fef3c7' : '#dbeafe'}; padding: 12px; border-radius: 8px; border-left: 5px solid ${deviceType === 'filter' ? '#f59e0b' : '#3b82f6'}; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 18px;">${deviceIcon}</span>
                  <strong style="font-size: ${isMobile ? '14px' : '15px'}; color: #1f2937;">Device Type: ${deviceTypeLabel}</strong>
                </div>
                <p style="font-size: ${isMobile ? '12px' : '13px'}; color: #374151; margin: 0; line-height: 1.4;">
                  ${deviceDescription}
                </p>
              </div>
              
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #374151; display: block; margin-bottom: 4px;">📍 Address:</strong>
                <span style="color: #1f2937; font-weight: 600; font-size: ${isMobile ? '13px' : '14px'};">${address}</span><br/>
                <span style="color: #6b7280; font-size: 12px;">${city}, PA ${zipCode}</span>
              </div>

              <div style="background-color: #f0fdf4; padding: 10px; border-radius: 6px; border-left: 4px solid #22c55e; font-size: 12px; color: #166534; margin-bottom: 12px;">
                <strong>✅ VCAN Distribution:</strong><br/>
                This location has received <strong>${deviceType === 'filter' ? 'an air filter' : 'an air purifier'}</strong> from VCAN (Valley Clean Air Now) to help improve indoor air quality and protect residents from pollution exposure.
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                <div style="font-size: 11px; color: #6b7280;">
                  <strong style="color: #374151; display: block; margin-bottom: 4px;">Data Source:</strong>
                  <div style="display: flex; align-items: start; gap: 6px;">
                    <span style="color: #22c55e; font-size: 14px;">❤️</span>
                    <div>
                      <div style="font-weight: 600; color: #1f2937;">VCAN Distribution Records</div>
                      <div style="margin-top: 2px; font-size: 10px;">Addresses where VCAN has distributed air filters and purifiers to the Mon Valley community</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
          
          if (map.current) {
            new mapboxgl.Popup({ closeOnClick: true, maxWidth: popupMaxWidthMapbox })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(map.current);
          }
        }
      };
      
      // Change cursor on hover
      const handleMouseEnter = () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      };
      
      const handleMouseLeave = () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      };
      
      // Remove existing handlers before adding new ones
      if (map.current) {
        try {
          map.current.off('click', 'vcan-distribution', vcanClickHandler);
          map.current.off('mouseenter', 'vcan-distribution', handleMouseEnter);
          map.current.off('mouseleave', 'vcan-distribution', handleMouseLeave);
        } catch (e) {
          // Ignore errors - handlers may not exist yet
        }
      }
      
      // Add handlers
      if (map.current) {
        map.current.on('click', 'vcan-distribution', vcanClickHandler);
        map.current.on('mouseenter', 'vcan-distribution', handleMouseEnter);
        map.current.on('mouseleave', 'vcan-distribution', handleMouseLeave);
      }
    };

    loadVCANLayer();
    
    // Cleanup function
    return () => {
      if (map.current) {
        try {
          // Note: We can't remove handlers without function references, but they'll be replaced on next render
          // This is acceptable as the handlers are recreated each time
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [map.current, vcanLocations, showVCANDistribution]);

  // Handle "My Location" marker (matches legend - blue circle with crosshair)
  useEffect(() => {
    if (!map.current) return;

    if (!showMyLocation || !userLocation) {
      // Remove user location marker if disabled or no location
      if (map.current.getLayer('user-location')) {
        map.current.removeLayer('user-location');
      }
      if (map.current.getSource('user-location')) {
        map.current.removeSource('user-location');
      }
      return;
    }

    // Create crosshair icon if not already loaded
    const loadCrosshairIcon = async () => {
      if (map.current && !map.current.hasImage('crosshair-icon')) {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw blue circle background
          ctx.fillStyle = '#3b82f6'; // blue-500
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw white border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw white crosshair
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(4, size / 2);
          ctx.lineTo(size - 4, size / 2);
          ctx.stroke();
          // Vertical line
          ctx.beginPath();
          ctx.moveTo(size / 2, 4);
          ctx.lineTo(size / 2, size - 4);
          ctx.stroke();
        }
        // Convert canvas to ImageBitmap for Mapbox
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve);
        });
        if (blob && map.current) {
          const imageBitmap = await createImageBitmap(blob);
          if (map.current && !map.current.hasImage('crosshair-icon')) {
            map.current.addImage('crosshair-icon', imageBitmap);
          }
        }
      }
    };

    loadCrosshairIcon().then(() => {
      if (!map.current || !map.current.hasImage('crosshair-icon')) return;

      const userLocationGeoJSON = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [userLocation.lng, userLocation.lat],
            },
            properties: {
              id: 'user-location',
            },
          },
        ],
      };

      const source = map.current.getSource('user-location') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(userLocationGeoJSON);
        if (map.current.getLayer('user-location')) {
          map.current.setLayoutProperty('user-location', 'visibility', 'visible');
        }
      } else {
        map.current.addSource('user-location', {
          type: 'geojson',
          data: userLocationGeoJSON,
        });

        map.current.addLayer({
          id: 'user-location',
          type: 'symbol',
          source: 'user-location',
          layout: {
            'icon-image': 'crosshair-icon',
            'icon-size': 1.0,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        });
      }
    });
  }, [map.current, showMyLocation, userLocation]);

  // Fetch user location when enabled
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
      {/* Header - Hidden on mobile, shown on desktop */}
      <div className="hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Sensor Map - Mon Valley Air Quality
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Interactive map showing air quality sensors, industrial facilities, and official monitoring stations.
          </p>
        </div>
        </div>

      {/* Map Container - Full width, moved up */}
      <div className="relative w-full">
        <div
          ref={mapContainer}
          className="w-full h-[calc(100vh-60px)] sm:h-[600px] sm:rounded-lg shadow-lg"
          style={{ minHeight: 'calc(100vh - 60px)' }}
        />
        
        {/* Layer Controls - Overlay on left side of map (mobile) */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-[1000] bg-black/40 backdrop-blur-md rounded-lg shadow-xl p-2 sm:p-3 border border-white/20 max-w-[calc(100vw-16px)] sm:max-w-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer px-2 py-1.5 sm:px-3 sm:py-2 rounded-md hover:bg-white/20 transition-colors text-xs sm:text-sm text-white">
            <input
              type="checkbox"
              checked={showSensors}
              onChange={(e) => setShowSensors(e.target.checked)}
                className="cursor-pointer w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="font-medium whitespace-nowrap">
                <Activity className="inline w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">PurpleAir Sensors</span>
                <span className="sm:hidden">Sensors</span>
                <span className="ml-0.5 sm:ml-1">({sensors.length})</span>
            </span>
          </label>
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer px-2 py-1.5 sm:px-3 sm:py-2 rounded-md hover:bg-white/20 transition-colors text-xs sm:text-sm text-white">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
                className="cursor-pointer w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="font-medium whitespace-nowrap">
                <Factory className="inline w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Title V Facilities</span>
                <span className="sm:hidden">Facilities</span>
                <span className="ml-0.5 sm:ml-1">({facilities.length})</span>
            </span>
          </label>
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer px-2 py-1.5 sm:px-3 sm:py-2 rounded-md hover:bg-white/20 transition-colors text-xs sm:text-sm text-white">
            <input
              type="checkbox"
              checked={showMyLocation}
              onChange={(e) => setShowMyLocation(e.target.checked)}
                className="cursor-pointer w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="font-medium whitespace-nowrap">
                <Navigation className="inline w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">My Location</span>
                <span className="sm:hidden">Location</span>
            </span>
          </label>
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer px-2 py-1.5 sm:px-3 sm:py-2 rounded-md hover:bg-white/20 transition-colors text-xs sm:text-sm text-white">
              <input
                type="checkbox"
                checked={showSmellReports}
                onChange={(e) => setShowSmellReports(e.target.checked)}
                className="cursor-pointer w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="font-medium whitespace-nowrap">
                <AlertCircle className="inline w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Smell Reports</span>
                <span className="sm:hidden">Smell</span>
                <span className="ml-0.5 sm:ml-1">({smellClusters.length > 0 ? smellClusters.length : '0'})</span>
              </span>
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer px-2 py-1.5 sm:px-3 sm:py-2 rounded-md hover:bg-white/20 transition-colors text-xs sm:text-sm text-white">
              <input
                type="checkbox"
                checked={showRiskZones}
                onChange={(e) => setShowRiskZones(e.target.checked)}
                className="cursor-pointer w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="font-medium whitespace-nowrap">
                <AlertTriangle className="inline w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Risk Zones</span>
                <span className="sm:hidden">Risk</span>
                <span className="ml-0.5 sm:ml-1">({riskZones.length > 0 ? riskZones.length : '0'})</span>
              </span>
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer px-2 py-1.5 sm:px-3 sm:py-2 rounded-md hover:bg-white/20 transition-colors text-xs sm:text-sm text-white">
              <input
                type="checkbox"
                checked={showVCANDistribution}
                onChange={(e) => setShowVCANDistribution(e.target.checked)}
                className="cursor-pointer w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="font-medium whitespace-nowrap">
                <Heart className="inline w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" style={{ color: '#22c55e' }} />
                <span className="hidden sm:inline">VCAN Distribution</span>
                <span className="sm:hidden">VCAN</span>
                <span className="ml-0.5 sm:ml-1">({vcanLocations.length > 0 ? vcanLocations.length : '0'})</span>
              </span>
            </label>
            
            {/* Share Button */}
            <div className="mt-2 sm:mt-0 sm:ml-2">
              <MapShareButton 
                mapUrl={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#map` : ''}
              />
            </div>
        </div>
      </div>

        {/* Map Legend */}
        {showLegend && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white rounded-lg shadow-xl p-3 sm:p-4 z-[1000] max-w-[calc(100vw-20px)] sm:max-w-xs border border-gray-200" style={{ maxWidth: '280px' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                Map Legend
              </h3>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
              </div>
            
            <div className="space-y-3 text-xs">
              {/* PurpleAir Sensors - First Section */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  PurpleAir Sensors
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 ml-5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00e400' }}></div>
                    <span>Good (0-12)</span>
            </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffff00' }}></div>
                    <span>Moderate (12-35)</span>
          </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff7e00' }}></div>
                    <span>Unhealthy Sensitive (35-55)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff0000' }}></div>
                    <span>Unhealthy (55-150)</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8f3f97' }}></div>
                    <span>Very Unhealthy (150+)</span>
                  </div>
                </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Community-operated sensors providing real-time PM2.5 readings
                </p>
      </div>

              {/* Smell PGH Reports - Second Section */}
              <div className="border-t border-gray-200 pt-3">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  Smell PGH Reports
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 ml-5">
                  <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent" style={{ borderBottomColor: '#90EE90' }}></div>
                    <span>Low (1-2)</span>
            </div>
                  <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent" style={{ borderBottomColor: '#FFD700' }}></div>
                    <span>Moderate (2-3)</span>
              </div>
                  <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent" style={{ borderBottomColor: '#FF8C00' }}></div>
                    <span>High (3-4)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent" style={{ borderBottomColor: '#DC143C' }}></div>
                    <span>Very High (4-5)</span>
                  </div>
                </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Crowdsourced odor reports from CMU Create Lab's Smell PGH platform
                </p>
              </div>

              {/* Risk Zones - Third Section */}
              <div className="border-t border-gray-200 pt-3">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  Risk Zones
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 ml-5">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#ffff00"
                        fillOpacity="0.45"
                        stroke="#ffff00"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>Elevated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#ff7e00"
                        fillOpacity="0.45"
                        stroke="#ff7e00"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#ff0000"
                        fillOpacity="0.45"
                        stroke="#ff0000"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>Severe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#9c27b0"
                        fillOpacity="0.45"
                        stroke="#9c27b0"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>Toxic</span>
                  </div>
                </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Dynamic hexagon zones generated from pollution events, sensor readings, and wind patterns
                </p>
              </div>

              {/* Title V Facilities - Fourth Section */}
              <div className="border-t border-gray-200 pt-3">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Factory className="w-3 h-3" />
                  Title V Facilities
                </h4>
                <div className="flex items-center gap-2 ml-5">
                  <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">🏭</div>
                  <span>Industrial facilities with major air pollution permits</span>
              </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Regulated under Clean Air Act Title V permits
                </p>
            </div>

              {/* VCAN Distribution - Fifth Section */}
              <div className="border-t border-gray-200 pt-3">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="w-3 h-3" style={{ color: '#22c55e' }} />
                  VCAN Distribution
                </h4>
                <div className="flex items-center gap-2 ml-5">
                  <span className="text-lg" style={{ color: '#22c55e' }}>❤️</span>
                  <span>Air filter and purifier distribution locations</span>
          </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Locations where VCAN (Valley Clean Air Now) has distributed air quality improvement devices to residents
                </p>
              </div>
      </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>Tip:</strong> Click any marker to see detailed information. Use checkboxes above to filter what's displayed.
              </p>
            </div>
              </div>
            )}

        {/* Show Legend Button (when hidden) - positioned to left of wind conditions */}
        {!showLegend && windData && (
          <button
            onClick={() => setShowLegend(true)}
            className="absolute top-2 right-[calc(100%-140px)] sm:top-4 sm:right-[calc(100%-160px)] bg-white rounded-lg shadow-lg p-2 z-[1000] border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Show Legend"
          >
            <Info className="w-5 h-5 text-gray-600" />
          </button>
        )}
        {/* Show Legend Button (when hidden and no wind data) */}
        {!showLegend && !windData && (
          <button
            onClick={() => setShowLegend(true)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white rounded-lg shadow-lg p-2 z-[1000] border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Show Legend"
          >
            <Info className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Wind Visualization on Map */}
        {windData && map.current && (
          <>
            {/* Wind Info Panel - Top right, with legend button positioned to its left */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/40 backdrop-blur-md rounded-lg p-3 shadow-lg z-[999] border border-white/20" style={{ minWidth: '140px' }}>
              <div className="text-xs font-semibold text-white mb-1 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-white" style={{ transform: `rotate(${windData.direction}deg)` }} />
                Wind Conditions
          </div>
            <div className="text-sm text-white">
              <div>Speed: {windData.speed.toFixed(1)} m/s</div>
              <div>Direction: {degreesToCompass(windData.direction)} ({windData.direction.toFixed(0)}°)</div>
              <div className="text-xs text-white/80 mt-1">
                Dispersion: {calculateDispersionFactor(windData.speed).toFixed(2)}x
        </div>
            </div>
          </div>
            
            {/* Wind Arrow Visualization on Map - Matches facility plumes */}
            {(() => {
              // Convert wind direction (meteorological: direction wind comes FROM) to bearing (direction wind goes TO)
              // This matches how facility plumes are calculated
              const bearing = (windData.direction + 180) % 360; // Wind blows TO this direction
              
              // Calculate arrow length based on wind speed (similar to plumes)
              const baseLength = 0.01; // ~1km
              const speedMultiplier = Math.min(windData.speed / 5, 2);
              const arrowLength = baseLength * (1 + speedMultiplier);
              
              // Calculate arrow end point using bearing (direction wind goes TO)
              const start = turf.point([CLAIRTON_COORDS.lng, CLAIRTON_COORDS.lat]);
              const end = turf.destination(start, arrowLength, bearing, { units: 'degrees' });
              
              // Create wind arrow GeoJSON
              const windArrow = {
                type: 'Feature' as const,
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [start.geometry.coordinates[0], start.geometry.coordinates[1]],
                    [end.geometry.coordinates[0], end.geometry.coordinates[1]]
                  ]
                },
                properties: {
                  speed: windData.speed,
                  direction: windData.direction,
                  bearing: bearing
                }
              };

              // Update or add wind arrow source and layer
              const source = map.current.getSource('wind-arrow') as mapboxgl.GeoJSONSource;
              if (source) {
                // Update existing source with new wind data
                source.setData({
                  type: 'FeatureCollection',
                  features: [windArrow]
                });
              } else {
                // Add wind arrow source and layer
                map.current.addSource('wind-arrow', {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: [windArrow]
                  }
                });

                map.current.addLayer({
                  id: 'wind-arrow-line',
                  type: 'line',
                  source: 'wind-arrow',
                  paint: {
                    'line-color': '#3b82f6',
                    'line-width': 3,
                    'line-opacity': 0.8
                  }
                });

                // Add arrowhead at end (rotated to show direction wind goes TO)
                map.current.addLayer({
                  id: 'wind-arrow-head',
                  type: 'symbol',
                  source: 'wind-arrow',
                  layout: {
                    'symbol-placement': 'point',
                    'icon-image': 'arrow',
                    'icon-rotate': bearing, // Rotate to show direction wind goes TO (matches plumes)
                    'icon-size': 1.5,
                    'icon-allow-overlap': true
                  }
                });
              }
              
              return null;
            })()}
          </>
        )}
      </div>

      {/* Note: All map elements (sensors, facilities, smell clusters, risk zones) now display in Mapbox popups on the map itself (VCAN requirement) */}
    </div>
  );
};

export default SensorMapMapbox;

