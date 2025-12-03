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
import { getAuth } from 'firebase/auth';
import * as turf from '@turf/turf';
import { Info, AlertCircle, MapPin, Factory, Activity, Navigation, X, AlertTriangle } from 'lucide-react';

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
  const [hiddenRiskZones, setHiddenRiskZones] = useState<Set<string>>(new Set()); // Track clicked/hidden zones
  const [facilityCompliance, setFacilityCompliance] = useState<any>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [triFacilities, setTriFacilities] = useState<any[]>([]);
  const [userHealthProfile, setUserHealthProfile] = useState<HealthProfile | null>(null);
  const riskZoneClickHandlerRef = useRef<((e: mapboxgl.MapLayerMouseEvent) => void) | null>(null);
  
  // Use real-time polling hook (60 seconds as per VCAN requirement)
  const { sensors: realtimeSensors, loading: sensorsLoading } = useRealtimeSensorData(60000);

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
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
    // Elevated: 25-50, High: 50-75, Severe: 75-100, Toxic: 100+
    const events = sensorsWithRisk
      .filter(s => {
        const hasElevatedRisk = s.riskIndex >= 25;
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
            
            const popupContent = `
              <div style="min-width: 250px; max-width: 350px;">
                <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${colorHex}; flex-shrink: 0; margin-top: 4px;"></div>
                  <div style="flex: 1;">
                    <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 4px 0; color: #1f2937;">${sensorWithRisk.name || 'Sensor'}</h3>
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">${sensorWithRisk.source || 'Unknown Source'}</p>
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
                  Speed: ${windData.speed.toFixed(1)} m/s | Direction: ${windData.direction.toFixed(0)}°<br/>
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
            
            // Create and show popup
            new mapboxgl.Popup({ closeOnClick: true, maxWidth: '400px' })
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
            
            // Create popup first with loading state
            const popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '450px' })
              .setLngLat(e.lngLat)
              .setHTML(`
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
            
            const popupContent = `
              <div style="min-width: 250px; max-width: 350px;">
                <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${smellColor}; flex-shrink: 0; margin-top: 4px;"></div>
                  <div style="flex: 1;">
                    <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 4px 0; color: #1f2937;">Smell Report Cluster</h3>
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">Crowdsourced Odor Reports</p>
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
            
            // Create and show popup
            new mapboxgl.Popup({ closeOnClick: true, maxWidth: '400px' })
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
      // Remove existing layers if present
      if (map.current.getLayer('risk-zones-fill')) {
        map.current.removeLayer('risk-zones-fill');
        map.current.removeLayer('risk-zones-outline');
      }
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
      source.setData(zonesGeoJSON);
    } else {
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
          'fill-opacity': [
            'case',
            ['to-boolean', ['get', 'hidden']], 0, // Hidden zones are invisible but clickable
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
    }

    // Always ensure click handlers are attached (even if source already exists)
    // Store handler reference to allow removal
    const riskZoneClickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
      console.log('🔵 Risk zone clicked!', e);
      console.log('🔵 Click event details:', {
        features: e.features?.length || 0,
        lngLat: e.lngLat,
        point: e.point,
        originalEvent: e.originalEvent?.type,
      });
      
      if (!e.features || !e.features[0] || !e.lngLat || !e.features[0].properties) {
        console.warn('⚠️ Click event missing required data:', { features: e.features, lngLat: e.lngLat });
        return;
      }
      
      const props = e.features[0].properties;
      const zoneId = props.id as string;
      console.log('🔵 Zone ID from click:', zoneId, 'Available zones:', riskZones.length);
      
      // Find zone by index (zones are indexed in the GeoJSON)
      const zoneIndex = parseInt(zoneId.replace('risk-zone-', ''), 10);
      const zone = riskZones[zoneIndex];
      
      if (!zone) {
        console.warn('⚠️ Zone not found for ID:', zoneId, 'Index:', zoneIndex);
        return;
      }
      
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
        
        const popupContent = `
              <div style="min-width: 280px; max-width: 400px;">
                <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 16px; height: 16px; border-radius: 4px; background-color: ${riskColor}; flex-shrink: 0; margin-top: 2px;"></div>
                  <div style="flex: 1;">
                    <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 4px 0; color: #1f2937;">${riskLabel}</h3>
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">Dynamic Risk Zone</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Risk Level:</strong><br/>
                  <span style="color: ${riskColor}; font-weight: 600; text-transform: capitalize;">${riskLevel}</span>
                </div>
                
                ${zone.affectedArea ? `
                <div style="margin-bottom: 12px; font-size: 13px;">
                  <strong style="color: #374151;">Affected Area:</strong><br/>
                  <span style="color: #1f2937;">${zone.affectedArea.toFixed(2)} km²</span>
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
        
        // Create and show popup
        new mapboxgl.Popup({ closeOnClick: true, maxWidth: '450px' })
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map.current);
      }
    };
    
    // Store handler in ref for cleanup
    riskZoneClickHandlerRef.current = riskZoneClickHandler;
    
    // Wait a bit to ensure layers are fully rendered before attaching handlers
    const attachHandlers = () => {
      if (!map.current) return;
      
      // Remove previous handler if it exists, then attach new one
      const previousHandler = riskZoneClickHandlerRef.current;
      if (previousHandler) {
        try {
          if (map.current.getLayer('risk-zones-fill')) {
            map.current.off('click', 'risk-zones-fill', previousHandler);
          }
          if (map.current.getLayer('risk-zones-outline')) {
            map.current.off('click', 'risk-zones-outline', previousHandler);
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Attach handlers to both fill and outline layers
      // Use 'data' event to ensure source has data before attaching handlers
      const source = map.current.getSource('risk-zones') as mapboxgl.GeoJSONSource;
      if (source) {
        // Wait for source data to be loaded
        source.once('data', () => {
          if (map.current?.getLayer('risk-zones-fill')) {
            map.current.on('click', 'risk-zones-fill', riskZoneClickHandler);
            console.log('✅ Risk zone fill click handler attached (after data load)');
          }
          if (map.current?.getLayer('risk-zones-outline')) {
            map.current.on('click', 'risk-zones-outline', riskZoneClickHandler);
            console.log('✅ Risk zone outline click handler attached (after data load)');
          }
        });
      }
      
      // Also attach immediately if layers exist (for when source already has data)
      if (map.current.getLayer('risk-zones-fill')) {
        map.current.on('click', 'risk-zones-fill', riskZoneClickHandler);
        console.log('✅ Risk zone fill click handler attached');
      } else {
        console.warn('⚠️ risk-zones-fill layer not found');
      }

      if (map.current.getLayer('risk-zones-outline')) {
        map.current.on('click', 'risk-zones-outline', riskZoneClickHandler);
        console.log('✅ Risk zone outline click handler attached');
      } else {
        console.warn('⚠️ risk-zones-outline layer not found');
      }
    };
    
    // Attach handlers after map is loaded and layers are ready
    // Use map 'load' event to ensure handlers are attached when layers exist
    const attachHandlersWhenReady = () => {
      if (!map.current) return;
      
      // Wait for map to be fully loaded
      if (map.current.loaded()) {
        attachHandlers();
      } else {
        // If map not loaded yet, wait for load event
        map.current.once('load', () => {
          setTimeout(attachHandlers, 200); // Small delay to ensure layers are rendered
        });
      }
    };
    
    // Try attaching immediately, and also set up for when map loads
    attachHandlers();
    attachHandlersWhenReady();
    
    // Also try after delays to catch layers that are added later
    const timeoutId1 = setTimeout(attachHandlers, 100);
    const timeoutId2 = setTimeout(attachHandlers, 500);
    const timeoutId3 = setTimeout(attachHandlers, 1000);
    
    // Cleanup function
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      if (map.current && riskZoneClickHandlerRef.current) {
        try {
          const handler = riskZoneClickHandlerRef.current;
          if (map.current.getLayer('risk-zones-fill')) {
            map.current.off('click', 'risk-zones-fill', handler);
          }
          if (map.current.getLayer('risk-zones-outline')) {
            map.current.off('click', 'risk-zones-outline', handler);
          }
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
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={showSmellReports}
              onChange={(e) => setShowSmellReports(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm sm:text-base font-medium">
              <AlertCircle className="inline w-4 h-4 mr-1" />
              Smell Reports ({smellClusters.length > 0 ? smellClusters.length : 'No data'})
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={showRiskZones}
              onChange={(e) => setShowRiskZones(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm sm:text-base font-medium">
              <AlertTriangle className="inline w-4 h-4 mr-1" />
              Risk Zones ({riskZones.length > 0 ? riskZones.length : 'No events'})
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

        {/* Map Legend */}
        {showLegend && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-4 z-[1000] max-w-xs border border-gray-200">
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
                <div className="space-y-1.5 ml-5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00e400' }}></div>
                    <span>Good (0-12 μg/m³)</span>
            </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffff00' }}></div>
                    <span>Moderate (12-35 μg/m³)</span>
          </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff7e00' }}></div>
                    <span>Unhealthy for Sensitive (35-55 μg/m³)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff0000' }}></div>
                    <span>Unhealthy (55-150 μg/m³)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8f3f97' }}></div>
                    <span>Very Unhealthy (150+ μg/m³)</span>
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
                <div className="space-y-1.5 ml-5">
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
                <div className="space-y-1.5 ml-5">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#ffff00"
                        fillOpacity="0.45"
                        stroke="#ffff00"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>Elevated Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#ff7e00"
                        fillOpacity="0.45"
                        stroke="#ff7e00"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>High Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#ff0000"
                        fillOpacity="0.45"
                        stroke="#ff0000"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>Severe Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
                      <polygon
                        points="10,2 16,6 16,14 10,18 4,14 4,6"
                        fill="#9c27b0"
                        fillOpacity="0.45"
                        stroke="#9c27b0"
                        strokeWidth="1"
                      />
                    </svg>
                    <span>Toxic Event</span>
                  </div>
                </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Dynamic hexagon zones generated from pollution events, sensor readings, and wind patterns
                </p>
              </div>

              {/* Title V Facilities - Fourth Section (Bottom) */}
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
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>Tip:</strong> Click any marker to see detailed information. Use checkboxes above to filter what's displayed.
              </p>
            </div>
              </div>
            )}

        {/* Show Legend Button (when hidden) */}
        {!showLegend && (
          <button
            onClick={() => setShowLegend(true)}
            className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[1000] border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Show Legend"
          >
            <Info className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Wind Visualization on Map */}
        {windData && map.current && (
          <>
            {/* Wind Info Panel */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10">
              <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <Navigation className="w-4 h-4" style={{ transform: `rotate(${windData.direction}deg)` }} />
                Wind Conditions
          </div>
            <div className="text-sm">
              <div>Speed: {windData.speed.toFixed(1)} m/s</div>
              <div>Direction: {windData.direction.toFixed(0)}°</div>
              <div className="text-xs text-gray-500 mt-1">
                Dispersion: {calculateDispersionFactor(windData.speed).toFixed(2)}x
        </div>
            </div>
          </div>
            
            {/* Wind Arrow Visualization on Map */}
            {(() => {
              // Add wind arrow layer if not already added
              if (map.current.getSource('wind-arrow')) {
                return null;
              }
              
              // Create wind arrow GeoJSON
              const windArrow = {
                type: 'Feature' as const,
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [CLAIRTON_COORDS.lng, CLAIRTON_COORDS.lat],
                    [
                      CLAIRTON_COORDS.lng + (windData.speed * 0.001 * Math.cos((windData.direction - 90) * Math.PI / 180)),
                      CLAIRTON_COORDS.lat + (windData.speed * 0.001 * Math.sin((windData.direction - 90) * Math.PI / 180))
                    ]
                  ]
                },
                properties: {
                  speed: windData.speed,
                  direction: windData.direction
                }
              };

              // Add wind arrow source and layer
              if (!map.current.getSource('wind-arrow')) {
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

                // Add arrowhead at end (using point placement instead)
                map.current.addLayer({
                  id: 'wind-arrow-head',
                  type: 'symbol',
                  source: 'wind-arrow',
                  layout: {
                    'symbol-placement': 'point',
                    'icon-image': 'arrow',
                    'icon-rotate': windData.direction,
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

