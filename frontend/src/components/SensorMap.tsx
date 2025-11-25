import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { shouldUseEmulator } from '../utils/env';
import { Info, AlertCircle, MapPin, Factory, Activity, Navigation } from 'lucide-react';

// Fix Leaflet marker icon issue
// @ts-ignore
import iconUrl from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});

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
  operator: string;
  location: { lat: number; lng: number };
  permitId: string;
  permittedPollutants?: Array<{ pollutant: string; limit: number; unit: string }>;
  [key: string]: any;
}

interface SensorMapProps {
  sensors?: Sensor[];
  onSensorSelect: (sensor: Sensor) => void;
}

const CLAIRTON_COORDS = { lat: 40.292, lng: -79.881 };
const MAP_ZOOM = 12;

// Helper function to get PM2.5 color based on AQI
const getPM25Color = (pm25?: number): string => {
  if (!pm25 || isNaN(pm25)) return '#9e9e9e'; // Gray for no data
  
  // EPA AQI color scale for PM2.5
  if (pm25 <= 12) return '#00e400';      // Green - Good (0-50)
  if (pm25 <= 35.4) return '#ffff00';    // Yellow - Moderate (51-100)
  if (pm25 <= 55.4) return '#ff7e00';    // Orange - Unhealthy for Sensitive Groups (101-150)
  if (pm25 <= 150.4) return '#ff0000';   // Red - Unhealthy (151-200)
  if (pm25 <= 250.4) return '#8f3f97';   // Purple - Very Unhealthy (201-300)
  return '#7e0023';                      // Maroon - Hazardous (301+)
};

// Helper function to get AQI level text
const getAQILevel = (pm25?: number): string => {
  if (!pm25 || isNaN(pm25)) return 'No Data';
  if (pm25 <= 12) return 'Good';
  if (pm25 <= 35.4) return 'Moderate';
  if (pm25 <= 55.4) return 'Unhealthy for Sensitive Groups';
  if (pm25 <= 150.4) return 'Unhealthy';
  if (pm25 <= 250.4) return 'Very Unhealthy';
  return 'Hazardous';
};

// Create custom colored marker icon
const createColoredIcon = (color: string, size: number = 20) => {
  return L.divIcon({
    className: 'custom-colored-marker',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: ${size * 0.4}px;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Component to reset map view when needed
const MapController: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

const SensorMap: React.FC<SensorMapProps> = ({ sensors: propSensors, onSensorSelect }) => {
  const [sensors, setSensors] = useState<Sensor[]>(propSensors || []);
  const [facilities, setFacilities] = useState<TitleVFacility[]>([]);
  const [achdSites, setAchdSites] = useState<Sensor[]>([]);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showACHD, setShowACHD] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'configured' | 'not_configured' | 'checking'>('checking');
  const [showMyLocation, setShowMyLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const geolocationWatchId = useRef<number | null>(null);

  useEffect(() => {
    if (propSensors && propSensors.length > 0) {
      setSensors(propSensors);
      return;
    }
    
    setLoading(true);
    setApiKeyStatus('checking');
    
    // Fetch PurpleAir sensors via backend function
    const fetchPurpleAir = async () => {
      try {
        // Use emulator URL in development, production URL otherwise
        const isDevelopment = shouldUseEmulator();
        const baseUrl = isDevelopment 
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        
        const response = await axios.get(`${baseUrl}/fetchPurpleAirSensorData`, {
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const sensors: Sensor[] = response.data.data.map((s: any) => ({
            id: s.id || `pa-${s.sensorIndex}`,
            name: s.name || `Sensor ${s.sensorIndex}`,
            location: s.location || { lat: 0, lng: 0 },
            pm25: s.pm25 !== null && s.pm25 !== undefined ? Number(s.pm25) : undefined,
            source: s.source || 'PurpleAir',
            sensorIndex: s.sensorIndex,
            humidity: s.humidity,
            temperature: s.temperature,
          })).filter((s: Sensor) => s.location.lat !== 0 && s.location.lng !== 0); // Filter out invalid locations
          
          setSensors(sensors);
          setApiKeyStatus('configured');
        } else {
          // Check if API key is not configured
          if (response.data?.message && response.data.message.includes('API key not configured')) {
            setApiKeyStatus('not_configured');
          const mockSensors: Sensor[] = [
            { id: 'mock-1', name: 'Clairton Sensor (Mock)', location: { lat: 40.292, lng: -79.881 }, pm25: 45.2, source: 'Mock Data' },
            { id: 'mock-2', name: 'Braddock Sensor (Mock)', location: { lat: 40.400, lng: -79.863 }, pm25: 38.7, source: 'Mock Data' },
            { id: 'mock-3', name: 'Dravosburg Sensor (Mock)', location: { lat: 40.350, lng: -79.886 }, pm25: 42.1, source: 'Mock Data' }
          ];
          setSensors(mockSensors);
          } else {
            setApiKeyStatus('configured');
            setSensors([]);
          }
        }
      } catch (err: any) {
        if (err.response?.data?.message?.includes('API key not configured')) {
          setApiKeyStatus('not_configured');
        const mockSensors: Sensor[] = [
          { id: 'mock-1', name: 'Clairton Sensor (Mock)', location: { lat: 40.292, lng: -79.881 }, pm25: 45.2, source: 'Mock Data' },
          { id: 'mock-2', name: 'Braddock Sensor (Mock)', location: { lat: 40.400, lng: -79.863 }, pm25: 38.7, source: 'Mock Data' },
          { id: 'mock-3', name: 'Dravosburg Sensor (Mock)', location: { lat: 40.350, lng: -79.886 }, pm25: 42.1, source: 'Mock Data' }
        ];
        setSensors(mockSensors);
        } else {
          setApiKeyStatus('configured');
          setSensors([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchPurpleAir();
  }, [propSensors]);

  // Fetch ACHD monitoring sites
  useEffect(() => {
    const fetchACHDMonitoring = async () => {
      try {
        const achdSites: Sensor[] = [
          {
            id: 'achd-liberty',
            name: 'Liberty - Official ACHD Monitor',
            location: { lat: 40.291, lng: -79.886 },
            pm25: undefined,
            source: 'ACHD Official'
          },
          {
            id: 'achd-lawrenceville',
            name: 'Lawrenceville - Official ACHD Monitor',
            location: { lat: 40.467, lng: -79.958 },
            pm25: undefined,
            source: 'ACHD Official'
          },
          {
            id: 'achd-lincoln',
            name: 'Lincoln - Official ACHD Monitor',
            location: { lat: 40.265, lng: -79.932 },
            pm25: undefined,
            source: 'ACHD Official'
          },
          {
            id: 'achd-north-braddock',
            name: 'North Braddock - Official ACHD Monitor',
            location: { lat: 40.400, lng: -79.863 },
            pm25: undefined,
            source: 'ACHD Official'
          },
          {
            id: 'achd-clairton',
            name: 'Clairton - Official ACHD Monitor',
            location: { lat: 40.292, lng: -79.881 },
            pm25: undefined,
            source: 'ACHD Official'
          }
        ];
        setAchdSites(achdSites);
      } catch (err: any) {
        console.warn('Could not set up ACHD monitoring sites:', err.message);
      }
    };
    fetchACHDMonitoring();
  }, []);

  // Fetch Title V facilities
  useEffect(() => {
    const fetchTitleVFacilities = async () => {
      try {
        // Use emulator URL in development, production URL otherwise
        const isDevelopment = shouldUseEmulator();
        const baseUrl = isDevelopment 
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        const resp = await axios.get(`${baseUrl}/getTitleVFacilities`, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Title V Facilities Response:', resp.data);
        console.log('Title V Facilities Raw:', JSON.stringify(resp.data.facilities, null, 2));
        
        if (resp.data.success && resp.data.facilities && Array.isArray(resp.data.facilities)) {
          // Filter out facilities with invalid locations
          const validFacilities = resp.data.facilities.filter((facility: any) => {
            // Check if location exists and is valid
            const location = facility.location;
            if (!location) {
              console.warn('Facility missing location:', facility.facilityId || facility.id || facility.name);
              return false;
            }
            
            // Handle both number and string types (Firestore might return strings)
            const lat = typeof location.lat === 'string' ? parseFloat(location.lat) : location.lat;
            const lng = typeof location.lng === 'string' ? parseFloat(location.lng) : location.lng;
            
            const hasLocation = typeof lat === 'number' && 
                   typeof lng === 'number' &&
                   !isNaN(lat) && 
                   !isNaN(lng) &&
                   lat !== 0 && 
                   lng !== 0;
            
            if (!hasLocation) {
              console.warn('Invalid facility location:', facility.facilityId || facility.id || facility.name, { lat, lng, original: location });
            } else {
              // Normalize location to numbers
              facility.location.lat = lat;
              facility.location.lng = lng;
            }
            return hasLocation;
          });
          console.log(`Title V Facilities: ${resp.data.facilities.length} total, ${validFacilities.length} valid`);
          setFacilities(validFacilities);
        } else if (resp.data.success && resp.data.count === 0) {
          console.warn('Title V Facilities: No facilities found in database. Need to seed facilities first.');
          setFacilities([]);
        } else {
          console.error('Title V Facilities: Invalid response format', resp.data);
          setFacilities([]);
        }
      } catch (err: any) {
        console.error('Title V Facilities fetch error:', err);
        setFacilities([]);
      }
    };
    fetchTitleVFacilities();
  }, []);

  const handleSelect = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    onSensorSelect(sensor);
  };

  // Handle "My Location" toggle
  useEffect(() => {
    // Cleanup function to clear any existing watch
    return () => {
      if (geolocationWatchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geolocationWatchId.current);
        geolocationWatchId.current = null;
      }
    };
  }, []);

  // Handle "My Location" feature - simplified to just work
  useEffect(() => {
    if (showMyLocation) {
      // Simple direct geolocation request
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser.');
        setShowMyLocation(false);
        return;
      }

      setLocationError(null);

      // Direct geolocation request - let browser handle permission prompt
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
          console.log('My Location updated:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          // Don't log permission denied errors - they're expected if user previously denied
          if (error.code !== error.PERMISSION_DENIED) {
            console.error('Geolocation error:', error);
          }
          
          let errorMessage = 'Unable to retrieve your location';
          
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location access was denied. Click the lock icon in your browser\'s address bar, enable location permissions, then refresh the page and try again.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location information is unavailable.';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out. Please try again.';
          }
          
          setLocationError(errorMessage);
          setUserLocation(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Clear location when disabled
      setUserLocation(null);
      setLocationError(null);
    }
  }, [showMyLocation]);


  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-600">Loading sensors...</div>
    </div>
  );

  return (
    <div className="sensor-map w-full h-full min-h-screen bg-gray-50">
      {/* Header with title and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Sensor Map - Mon Valley Air Quality
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Interactive map showing air quality sensors, industrial facilities, and official monitoring stations in the Mon Valley region.
          </p>
        </div>
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
              checked={showACHD} 
              onChange={(e) => setShowACHD(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm sm:text-base font-medium">
              <MapPin className="inline w-4 h-4 mr-1" />
              ACHD Monitors ({achdSites.length})
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

      {/* API Key Status Alert */}
      {apiKeyStatus === 'not_configured' && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">PurpleAir API Key Not Configured</h3>
              <p className="text-sm text-yellow-700 mb-2">
                Currently showing mock sensor data. To see real-time PurpleAir community sensors, configure the API key in the backend.
              </p>
              <p className="text-xs text-yellow-600">
                See <code className="bg-yellow-100 px-1 rounded">PURPLEAIR_SETUP.md</code> for setup instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location Error Alert - Only show if there's an error and location is enabled */}
      {locationError && showMyLocation && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800 mb-1 text-sm sm:text-base">Enable Location Access</h3>
              <p className="text-xs sm:text-sm text-blue-700 mb-2">{locationError}</p>
              <div className="text-xs text-blue-600">
                <strong>Quick fix:</strong> Click the lock icon (🔒) in your browser's address bar → Location → Allow → Refresh page
              </div>
            </div>
            <button
              onClick={() => {
                setLocationError(null);
                setShowMyLocation(false);
              }}
              className="text-blue-600 hover:text-blue-800 flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        <MapContainer 
          center={[CLAIRTON_COORDS.lat, CLAIRTON_COORDS.lng]} 
          zoom={MAP_ZOOM} 
          style={{ height: '600px', width: '100%', borderRadius: '8px', zIndex: 1 }}
          className="shadow-lg"
        >
          <MapController center={[CLAIRTON_COORDS.lat, CLAIRTON_COORDS.lng]} zoom={MAP_ZOOM} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
          
          {/* PurpleAir Sensors with color-coded markers */}
          {showSensors && sensors.length > 0 && sensors.map((sensor) => {
            // Ensure location exists and is valid
            if (!sensor.location || sensor.location.lat == null || sensor.location.lng == null) {
              return null;
            }
            
            const pm25 = sensor.pm25;
            const color = getPM25Color(pm25);
            const aqiLevel = getAQILevel(pm25);
            
            return (
          <Marker
            key={sensor.id}
            position={[sensor.location.lat, sensor.location.lng]}
                icon={createColoredIcon(color, 24)}
            eventHandlers={{
              click: () => handleSelect(sensor),
            }}
          >
                <Popup className="custom-popup" maxWidth={300}>
                  <div className="p-2">
                    <div className="flex items-start gap-2 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 mt-1" 
                        style={{ backgroundColor: color }}
                      ></div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base mb-1">{sensor.name || 'Unknown Sensor'}</h3>
                        <p className="text-xs text-gray-500 mb-2">{sensor.source || 'Unknown Source'}</p>
                      </div>
                    </div>
                    
                    {pm25 !== undefined && pm25 !== null && !isNaN(pm25) ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">PM2.5:</span>
                          <span className="text-sm font-bold text-gray-900">{pm25.toFixed(1)} μg/m³</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Air Quality:</span>
                          <span className="text-xs px-2 py-1 rounded font-semibold text-gray-900" style={{ backgroundColor: color + '20' }}>
                            {aqiLevel}
                          </span>
                        </div>
                        {sensor.humidity !== undefined && sensor.humidity !== null && !isNaN(sensor.humidity) && (
                          <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>Humidity:</span>
                            <span>{Number(sensor.humidity).toFixed(1)}%</span>
                          </div>
                        )}
                        {sensor.temperature !== undefined && sensor.temperature !== null && !isNaN(sensor.temperature) && (
                          <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>Temperature:</span>
                            <span>{Number(sensor.temperature).toFixed(1)}°F</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No PM2.5 data available</p>
                    )}
                    
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <strong>Location:</strong> {Number(sensor.location.lat).toFixed(4)}, {Number(sensor.location.lng).toFixed(4)}
                      </p>
                    </div>
              </div>
            </Popup>
          </Marker>
            );
          })}
          
          {/* Title V Facilities */}
          {showFacilities && facilities.length > 0 && facilities.map((facility) => {
            // Ensure location exists and is valid
            if (!facility.location || 
                typeof facility.location.lat !== 'number' || 
                typeof facility.location.lng !== 'number' ||
                isNaN(facility.location.lat) || 
                isNaN(facility.location.lng) ||
                facility.location.lat === 0 || 
                facility.location.lng === 0) {
              console.warn('Skipping facility with invalid location:', facility.facilityId || facility.id || facility.name, facility.location);
              return null;
            }
            
            const facilityKey = facility.facilityId || facility.id || `facility-${facility.name}`;
            
            return (
          <Marker
            key={facilityKey}
            position={[facility.location.lat, facility.location.lng]}
            icon={L.divIcon({
              className: 'custom-titlev-marker',
                html: '<div style="background: #d32f2f; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">🏭</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              })}
            >
              <Popup className="custom-popup" maxWidth={300}>
                <div className="p-2">
                  <h3 className="font-bold text-base mb-2 text-red-600">🏭 {facility.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Operator:</strong> {facility.operator}
                    </div>
              <div>
                      <strong>Permit ID:</strong> {facility.permitId}
                    </div>
                    {facility.permittedPollutants && facility.permittedPollutants.length > 0 && (
                      <div className="mt-2">
                        <strong className="block mb-1">Permitted Pollutants:</strong>
                        <ul className="list-disc list-inside text-xs space-y-0.5">
                          {facility.permittedPollutants.map((p, idx) => (
                            <li key={idx}>
                              {p.pollutant}: {p.limit} {p.unit}/yr
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {facility.location && facility.location.lat != null && facility.location.lng != null && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                        <strong>Location:</strong> {Number(facility.location.lat).toFixed(4)}, {Number(facility.location.lng).toFixed(4)}
                      </div>
                    )}
                  </div>
              </div>
            </Popup>
          </Marker>
            );
          })}
          
          {/* ACHD Official Monitors */}
          {showACHD && achdSites.map((site) => {
            // Ensure location exists and is valid
            if (!site.location || site.location.lat == null || site.location.lng == null) {
              return null;
            }
            
            return (
          <Marker
            key={site.id}
            position={[site.location.lat, site.location.lng]}
            icon={L.divIcon({
              className: 'custom-achd-marker',
                html: '<div style="background: #1976d2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">🏢</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            >
              <Popup className="custom-popup" maxWidth={300}>
                <div className="p-2">
                  <h3 className="font-bold text-base mb-2 text-blue-600">🏢 {site.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Source:</strong> {site.source}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Official Allegheny County Health Department air quality monitoring station. Data is reported to EPA AQS.
                    </p>
                    {site.location && site.location.lat != null && site.location.lng != null && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                        <strong>Location:</strong> {Number(site.location.lat).toFixed(4)}, {Number(site.location.lng).toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
            );
          })}

          {/* My Location Marker */}
          {showMyLocation && userLocation && (
            <Marker
              key="my-location"
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: 'custom-my-location-marker',
                html: `<div style="
                  background: #2196F3;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  border: 4px solid white;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  animation: pulse 2s infinite;
                ">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20M2 12h20"/>
                  </svg>
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Popup className="custom-popup" maxWidth={300}>
                <div className="p-2">
                  <div className="flex items-start gap-2 mb-2">
                    <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-1 text-blue-600">My Location</h3>
                      <p className="text-xs text-gray-500 mb-2">Your current position</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Latitude:</span>
                      <span className="font-semibold text-gray-900">{Number(userLocation.lat).toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Longitude:</span>
                      <span className="font-semibold text-gray-900">{Number(userLocation.lng).toFixed(6)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      This marker shows your current location relative to air quality sensors and facilities in the Mon Valley region.
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Legend Panel */}
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
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
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
              
              <div className="border-t border-gray-200 pt-3">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  ACHD Official Monitors
                </h4>
                <div className="flex items-center gap-2 ml-5">
                  <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">🏢</div>
                  <span>Official government air quality monitoring stations</span>
                </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Data reported to EPA Air Quality System (AQS)
                </p>
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Navigation className="w-3 h-3" />
                  My Location
                </h4>
                <div className="flex items-center gap-2 ml-5">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M2 12h20"/>
                    </svg>
                  </div>
                  <span>Your current location on the map</span>
                </div>
                <p className="text-gray-500 mt-1 ml-5 text-xs">
                  Enable location tracking to see your position relative to sensors and facilities
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
      </div>

      {/* Selected Sensor Details Panel */}
      {selectedSensor && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg">Selected Sensor Details</h3>
            <button
              onClick={() => setSelectedSensor(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Name:</strong> {selectedSensor.name}
            </div>
            <div>
              <strong>Source:</strong> {selectedSensor.source || 'Unknown'}
            </div>
            {selectedSensor.pm25 !== undefined && selectedSensor.pm25 !== null && !isNaN(selectedSensor.pm25) && (
              <>
                <div>
                  <strong>PM2.5:</strong> {Number(selectedSensor.pm25).toFixed(2)} μg/m³
                </div>
                <div>
                  <strong>Air Quality:</strong> {getAQILevel(selectedSensor.pm25)}
                </div>
              </>
            )}
            {selectedSensor.location && selectedSensor.location.lat != null && selectedSensor.location.lng != null && (
              <div>
                <strong>Location:</strong> {Number(selectedSensor.location.lat).toFixed(4)}, {Number(selectedSensor.location.lng).toFixed(4)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorMap; 
