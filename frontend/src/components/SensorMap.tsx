import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

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

const SensorMap: React.FC<SensorMapProps> = ({ sensors: propSensors, onSensorSelect }) => {
  const [sensors, setSensors] = useState<Sensor[]>(propSensors || []);
  const [facilities, setFacilities] = useState<TitleVFacility[]>([]);
  const [achdSites, setAchdSites] = useState<Sensor[]>([]);
  const [showFacilities, setShowFacilities] = useState(true); // Toggle for Title V facilities
  const [showSensors, setShowSensors] = useState(true); // Toggle for PurpleAir sensors
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propSensors && propSensors.length > 0) return;
    setLoading(true);
    // Fetch PurpleAir public sensors for Mon Valley (Clairton area)
    const fetchPurpleAir = async () => {
      try {
        const apiKey = process.env.REACT_APP_PURPLEAIR_API_KEY;
        if (!apiKey) {
          console.log('PurpleAir API key not configured, using mock sensors');
          // Use mock sensor data
          const mockSensors: Sensor[] = [
            { id: 'mock-1', name: 'Clairton Sensor (Mock)', location: { lat: 40.292, lng: -79.881 }, pm25: 45.2, source: 'Mock Data' },
            { id: 'mock-2', name: 'Braddock Sensor (Mock)', location: { lat: 40.400, lng: -79.863 }, pm25: 38.7, source: 'Mock Data' },
            { id: 'mock-3', name: 'Dravosburg Sensor (Mock)', location: { lat: 40.350, lng: -79.886 }, pm25: 42.1, source: 'Mock Data' }
          ];
          setSensors(mockSensors);
          return;
        }
        
        console.log('Fetching PurpleAir sensors with API key:', apiKey.substring(0, 10) + '...');
        
        // Fetch public sensors near Mon Valley (larger area to get all sensors)
        const resp = await axios.get(
          'https://api.purpleair.com/v1/sensors',
          {
            params: {
              fields: 'sensor_index,name,latitude,longitude,pm2.5',
              nwlng: -80.3, // NW corner (wider area)
              nwlat: 40.5,
              selng: -79.6, // SE corner
              selat: 40.0,
              max_age: 3600,
            },
            headers: {
              'X-API-Key': apiKey,
            },
          }
        );
        
        const data = resp.data.data || [];
        const fields = resp.data.fields || [];
        
        console.log('PurpleAir API returned', data.length, 'sensors');
        
        // Map PurpleAir data to Sensor[]
        const sensors: Sensor[] = data.map((row: any[]) => {
          const obj: any = {};
          fields.forEach((field: string, idx: number) => {
            obj[field] = row[idx];
          });
          return {
            id: `pa-${obj['sensor_index']}`,
            name: obj['name'] || `Sensor ${obj['sensor_index']}`,
            location: { lat: obj['latitude'], lng: obj['longitude'] },
            pm25: obj['pm2.5'],
            source: 'PurpleAir',
            sensorIndex: obj['sensor_index'],
          };
        });
        
        console.log('Mapped', sensors.length, 'PurpleAir sensors');
        setSensors(sensors);
      } catch (err: any) {
        console.warn('Could not fetch PurpleAir data:', err.message);
        // Use mock data as fallback
        const mockSensors: Sensor[] = [
          { id: 'mock-1', name: 'Clairton Sensor (Mock)', location: { lat: 40.292, lng: -79.881 }, pm25: 45.2, source: 'Mock Data' },
          { id: 'mock-2', name: 'Braddock Sensor (Mock)', location: { lat: 40.400, lng: -79.863 }, pm25: 38.7, source: 'Mock Data' },
          { id: 'mock-3', name: 'Dravosburg Sensor (Mock)', location: { lat: 40.350, lng: -79.886 }, pm25: 42.1, source: 'Mock Data' }
        ];
        setSensors(mockSensors);
      } finally {
        setLoading(false);
      }
    };
    fetchPurpleAir();
  }, [propSensors]);

  // Fetch ACHD monitoring sites from WPRDC
  useEffect(() => {
    const fetchACHDMonitoring = async () => {
      try {
        // ACHD official monitoring sites in Allegheny County
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

  // Fetch Title V facilities from Cloud Function
  useEffect(() => {
    const fetchTitleVFacilities = async () => {
      try {
        // Use local emulator URL when in development, otherwise production
        const isDevelopment = process.env.REACT_APP_USE_EMULATOR === 'true';
        const baseUrl = isDevelopment 
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        const resp = await axios.get(`${baseUrl}/getTitleVFacilities`);
        if (resp.data.success && resp.data.facilities) {
          setFacilities(resp.data.facilities);
        }
      } catch (err) {
        console.error('Failed to fetch Title V facilities:', err);
        // Fallback to seed data if function not deployed yet
      }
    };
    
    fetchTitleVFacilities();
  }, []);

  const handleSelect = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    onSensorSelect(sensor);
  };

  if (loading) return <div>Loading sensors...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  console.log('PurpleAir API KEY:', process.env.REACT_APP_PURPLEAIR_API_KEY);

  return (
    <div className="sensor-map" style={{ background: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '15px' }}>
        <h2>Sensor Map - Mon Valley Air Quality</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showSensors} 
              onChange={(e) => setShowSensors(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>PurpleAir Sensors ({sensors.length})</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showFacilities} 
              onChange={(e) => setShowFacilities(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Title V Facilities ({facilities.length})</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={true}
              disabled
              style={{ cursor: 'pointer' }}
            />
            <span>ACHD Official Monitors ({achdSites.length})</span>
          </label>
        </div>
      </div>
      <MapContainer center={[CLAIRTON_COORDS.lat, CLAIRTON_COORDS.lng]} zoom={MAP_ZOOM} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showSensors && sensors.map((sensor) => (
          <Marker
            key={sensor.id}
            position={[sensor.location.lat, sensor.location.lng]}
            eventHandlers={{
              click: () => handleSelect(sensor),
            }}
          >
            <Popup>
              <div>
                <strong>{sensor.name}</strong><br />
                Lat: {sensor.location.lat}, Lng: {sensor.location.lng}<br />
                {sensor.pm25 !== undefined && <>PM2.5: {sensor.pm25} μg/m³<br /></>}
                Source: {sensor.source || 'Unknown'}
              </div>
            </Popup>
          </Marker>
        ))}
        {showFacilities && facilities.map((facility) => (
          <Marker
            key={facility.facilityId}
            position={[facility.location.lat, facility.location.lng]}
            icon={L.divIcon({
              className: 'custom-titlev-marker',
              html: '<div style="background: #d32f2f; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #d32f2f;"></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              <div>
                <strong style={{ color: '#d32f2f' }}>🏭 {facility.name}</strong><br />
                <strong>Operator:</strong> {facility.operator}<br />
                <strong>Permit:</strong> {facility.permitId}<br />
                <strong>Pollutants:</strong> {facility.permittedPollutants?.map(p => `${p.pollutant} (${p.limit} ${p.unit}/yr)`).join(', ') || 'See permit'}
              </div>
            </Popup>
          </Marker>
        ))}
        {achdSites.map((site) => (
          <Marker
            key={site.id}
            position={[site.location.lat, site.location.lng]}
            icon={L.divIcon({
              className: 'custom-achd-marker',
              html: '<div style="background: #1976d2; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px #1976d2;"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>
              <div>
                <strong style={{ color: '#1976d2' }}>🏢 {site.name}</strong><br />
                <strong>Source:</strong> {site.source}<br />
                {site.pm25 !== undefined && <><strong>PM2.5:</strong> {site.pm25} μg/m³<br /></>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {selectedSensor && (
        <div className="sensor-details">
          <h3>Selected Sensor</h3>
          <pre>{JSON.stringify(selectedSensor, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default SensorMap; 