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

interface SensorMapProps {
  sensors?: Sensor[];
  onSensorSelect: (sensor: Sensor) => void;
}

const CLAIRTON_COORDS = { lat: 40.292, lng: -79.881 };
const MAP_ZOOM = 12;

const SensorMap: React.FC<SensorMapProps> = ({ sensors: propSensors, onSensorSelect }) => {
  const [sensors, setSensors] = useState<Sensor[]>(propSensors || []);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propSensors && propSensors.length > 0) return;
    setLoading(true);
    // Fetch PurpleAir public sensors for Mon Valley (Clairton area)
    const fetchPurpleAir = async () => {
      try {
        // Example: fetch public sensors near Clairton, PA (PurpleAir API v1)
        // NOTE: Replace 'YOUR_API_KEY' with a real key if available
        const resp = await axios.get(
          'https://api.purpleair.com/v1/sensors',
          {
            params: {
              fields: 'name,latitude,longitude,pm2.5',
              nwlng: -80.1, // NW corner
              nwlat: 40.4,
              selng: -79.7, // SE corner
              selat: 40.15,
              max_age: 3600,
              // api_key: 'YOUR_API_KEY', // If you have one
            },
            headers: {
              'X-API-Key': process.env.REACT_APP_PURPLEAIR_API_KEY || '', // Use .env for PurpleAir API key
            },
          }
        );
        const data = resp.data.data || [];
        const fields = resp.data.fields || [];
        // Map PurpleAir data to Sensor[]
        const sensors: Sensor[] = data.map((row: any[]) => {
          const obj: any = {};
          fields.forEach((field: string, idx: number) => {
            obj[field] = row[idx];
          });
          return {
            id: obj['name'] || `${obj['latitude']},${obj['longitude']}`,
            name: obj['name'] || 'PurpleAir Sensor',
            location: { lat: obj['latitude'], lng: obj['longitude'] },
            pm25: obj['pm2.5'],
            source: 'PurpleAir',
          };
        });
        setSensors(sensors);
      } catch (err: any) {
        setError('Failed to fetch public sensor data.');
      } finally {
        setLoading(false);
      }
    };
    fetchPurpleAir();
  }, [propSensors]);

  const handleSelect = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    onSensorSelect(sensor);
  };

  if (loading) return <div>Loading sensors...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  console.log('PurpleAir API KEY:', process.env.REACT_APP_PURPLEAIR_API_KEY);

  return (
    <div className="sensor-map">
      <h2>Sensor Map</h2>
      <MapContainer center={[CLAIRTON_COORDS.lat, CLAIRTON_COORDS.lng]} zoom={MAP_ZOOM} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sensors.map((sensor) => (
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