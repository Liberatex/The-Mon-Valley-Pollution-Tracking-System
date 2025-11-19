import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { shouldUseEmulator } from '../utils/env';

interface TitleVFacility {
  facilityId: string;
  name: string;
  location: { lat: number; lng: number };
  permittedPollutants?: Array<{ pollutant: string; limit: number; unit: string }>;
  emissionsData?: Array<{ year: number; pollutant: string; quantity: number }>;
}

interface Sensor {
  id: string;
  location: { lat: number; lng: number };
  pm25?: number;
}

interface ExposureData {
  location: { lat: number; lng: number };
  facilityId: string;
  facilityName: string;
  distance: number;
  pm25: number;
  exposureScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate exposure score based on PM2.5 and distance
function calculateExposureScore(pm25: number, distance: number): { score: number; riskLevel: 'low' | 'moderate' | 'high' | 'very_high' } {
  if (!pm25 || distance === 0) {
    return { score: 0, riskLevel: 'low' };
  }
  
  // Exposure score = PM2.5 concentration / distance (in miles)
  // Higher PM2.5 and closer to facility = higher exposure
  const score = pm25 / distance;
  
  let riskLevel: 'low' | 'moderate' | 'high' | 'very_high' = 'low';
  if (score >= 50) riskLevel = 'very_high';
  else if (score >= 20) riskLevel = 'high';
  else if (score >= 10) riskLevel = 'moderate';
  
  return { score, riskLevel };
}

const ExposureModel: React.FC = () => {
  const [facilities, setFacilities] = useState<TitleVFacility[]>([]);
  const [exposureData, setExposureData] = useState<ExposureData[]>([]);
  const [currentAQI, setCurrentAQI] = useState<number | null>(null);
  const [currentPM25, setCurrentPM25] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [locationInput, setLocationInput] = useState<string>('');
  const [locationMethod, setLocationMethod] = useState<'geolocation' | 'address' | 'coordinates' | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Load facilities on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFacilities() {
      try {
        const isDevelopment = shouldUseEmulator();
        const baseUrl = isDevelopment 
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        const facilitiesResp = await axios.get(`${baseUrl}/getTitleVFacilities`);
        if (!isMounted) return;
        const facilitiesData = facilitiesResp.data?.facilities || [];
        setFacilities(facilitiesData);
      } catch (err) {
        console.warn('Facilities fetch failed, continuing with empty list.', err);
        if (isMounted) setFacilities([]);
      }
    }
    setLoading(true);
    loadFacilities().finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  // Load air quality when user location is set
  useEffect(() => {
    if (!userLocation) return;
    
    let isMounted = true;
    const location = userLocation; // Capture for closure
    async function loadAirQuality() {
      try {
        const OWM_API_KEY = process.env.REACT_APP_OWM_API_KEY || '';
        const aqResp = await axios.get(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${location.lat}&lon=${location.lng}&appid=${OWM_API_KEY}`
        );
        if (!isMounted) return;
        setCurrentAQI(aqResp.data?.list?.[0]?.main?.aqi || null);
        setCurrentPM25(aqResp.data?.list?.[0]?.components?.pm2_5 ?? 35.0);
      } catch (err) {
        console.warn('Air quality fetch failed, using fallback.', err);
        if (isMounted) setCurrentPM25(35.0);
      }
    }
    loadAirQuality();
    return () => { isMounted = false; };
  }, [userLocation]);

  // Compute exposure whenever inputs are ready
  useEffect(() => {
    if (!userLocation || !currentPM25 || facilities.length === 0) {
      setExposureData([]);
      return;
    }
    try {
      const exposure = facilities
        .filter((f: any) => f.location?.lat && f.location?.lng)
        .map((facility: any) => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            facility.location.lat,
            facility.location.lng
          );
          const { score, riskLevel } = calculateExposureScore(currentPM25, distance);
          return {
            location: { lat: userLocation.lat, lng: userLocation.lng },
            facilityId: facility.facilityId,
            facilityName: facility.name,
            distance: Math.round(distance * 10) / 10,
            pm25: currentPM25,
            exposureScore: Math.round(score * 10) / 10,
            riskLevel
          };
        })
        .sort((a: any, b: any) => b.exposureScore - a.exposureScore);
      setExposureData(exposure);
    } catch (err) {
      console.error('Exposure computation failed:', err);
      setError('Failed to load exposure data. Please try again later.');
    }
  }, [facilities, currentPM25, userLocation]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'very_high': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'moderate': return '#fbc02d';
      case 'low': return '#388e3c';
      default: return '#666';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'very_high': return 'Very High Risk';
      case 'high': return 'High Risk';
      case 'moderate': return 'Moderate Risk';
      case 'low': return 'Low Risk';
      default: return 'Unknown';
    }
  };

  // Handle geolocation
  const handleUseGeolocation = () => {
    setGettingLocation(true);
    setLocationError(null);
    setLocationMethod('geolocation');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationError(null);
        setGettingLocation(false);
      },
      (err) => {
        setLocationError('Could not get your location. Please try entering your address manually.');
        setGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle address geocoding (using OpenWeatherMap geocoding API)
  const handleGeocodeAddress = async () => {
    if (!locationInput.trim()) {
      setLocationError('Please enter an address.');
      return;
    }

    setGettingLocation(true);
    setLocationError(null);
    setLocationMethod('address');

    try {
      const OWM_API_KEY = process.env.REACT_APP_OWM_API_KEY || '';
      const geocodeResp = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationInput)}&limit=1&appid=${OWM_API_KEY}`
      );

      if (geocodeResp.data && geocodeResp.data.length > 0) {
        const { lat, lon, name, state, country } = geocodeResp.data[0];
        setUserLocation({ 
          lat, 
          lng: lon,
          address: `${name}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`
        });
        setLocationError(null);
        setLocationInput(`${name}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`);
      } else {
        setLocationError('Address not found. Please try a different address or use coordinates.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setLocationError('Could not find that address. Please try again or use coordinates.');
    } finally {
      setGettingLocation(false);
    }
  };

  // Handle coordinate input (format: "lat,lng" or "lat, lng")
  const handleParseCoordinates = () => {
    if (!locationInput.trim()) {
      setLocationError('Please enter coordinates in the format: latitude,longitude');
      return;
    }

    setGettingLocation(true);
    setLocationError(null);
    setLocationMethod('coordinates');

    try {
      const parts = locationInput.trim().split(',').map(s => s.trim());
      if (parts.length !== 2) {
        throw new Error('Invalid format');
      }

      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid numbers');
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Out of range');
      }

      setUserLocation({ lat, lng });
      setLocationError(null);
    } catch (err) {
      setLocationError('Invalid coordinates. Please use format: latitude,longitude (e.g., 40.292,-79.881)');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleResetLocation = () => {
    setUserLocation(null);
    setLocationInput('');
    setLocationError(null);
    setExposureData([]);
    setCurrentAQI(null);
    setCurrentPM25(null);
  };

  if (loading) return <div className="loading">Calculating exposure risks...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#1976d2', 
        marginBottom: '30px',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Exposure Risk Model
      </h2>

      {/* Location Input Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '30px',
        borderRadius: '15px',
        color: 'white',
        marginBottom: '30px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.8rem', fontWeight: 'bold' }}>
          Enter Your Location
        </h3>
        <p style={{ marginBottom: '25px', fontSize: '1rem', opacity: 0.95 }}>
          Get personalized exposure risk analysis based on your location relative to industrial facilities.
        </p>

        {userLocation ? (
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                  {userLocation.address || `Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
                </strong>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  Exposure analysis will be calculated for this location
                </span>
              </div>
              <button
                onClick={handleResetLocation}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid white',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                Change Location
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button
              onClick={handleUseGeolocation}
              disabled={gettingLocation}
              style={{
                background: gettingLocation ? 'rgba(255,255,255,0.3)' : 'white',
                border: 'none',
                color: gettingLocation ? 'white' : '#667eea',
                padding: '15px 25px',
                borderRadius: '8px',
                cursor: gettingLocation ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: gettingLocation ? 'none' : '0 4px 15px rgba(0,0,0,0.2)'
              }}
            >
              {gettingLocation ? 'Getting your location...' : 'Use My Current Location'}
            </button>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Enter address (e.g., Clairton, PA) or coordinates (e.g., 40.292,-79.881)"
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (locationInput.includes(',')) {
                      handleParseCoordinates();
                    } else {
                      handleGeocodeAddress();
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  if (locationInput.includes(',') && /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(locationInput.trim())) {
                    handleParseCoordinates();
                  } else {
                    handleGeocodeAddress();
                  }
                }}
                disabled={gettingLocation || !locationInput.trim()}
                style={{
                  background: gettingLocation || !locationInput.trim() ? 'rgba(255,255,255,0.3)' : 'white',
                  border: 'none',
                  color: gettingLocation || !locationInput.trim() ? 'white' : '#667eea',
                  padding: '12px 25px',
                  borderRadius: '8px',
                  cursor: gettingLocation || !locationInput.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: gettingLocation || !locationInput.trim() ? 'none' : '0 4px 15px rgba(0,0,0,0.2)'
                }}
              >
                {gettingLocation ? 'Searching...' : 'Search'}
              </button>
            </div>

            {locationError && (
              <div style={{
                background: 'rgba(255,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.5)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: 'white'
              }}>
                {locationError}
              </div>
            )}

            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '10px' }}>
              You can enter an address (e.g., "Clairton, PA") or coordinates (e.g., "40.292,-79.881")
            </p>
          </div>
        )}
      </div>

      {/* Show results only if location is set */}
      {!userLocation && (
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '15px',
          textAlign: 'center',
          marginBottom: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          border: '2px solid #e0e0e0'
        }}>
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '15px' }}>
            Enter your location above to see personalized exposure risk analysis.
          </p>
          <p style={{ fontSize: '0.95rem', color: '#999' }}>
            Your exposure risk is calculated based on your proximity to industrial facilities and current air quality conditions.
          </p>
        </div>
      )}

      {userLocation && (
        <>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            color: '#333',
            marginBottom: '30px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
            border: '2px solid #e0e0e0'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.5rem', color: '#1976d2' }}>Current Conditions at Your Location</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ color: '#333', fontSize: '1rem' }}>
                <strong style={{ color: '#1976d2' }}>Current AQI:</strong> {currentAQI || 'N/A'}
              </div>
              <div style={{ color: '#333', fontSize: '1rem' }}>
                <strong style={{ color: '#1976d2' }}>Current PM2.5:</strong> {currentPM25?.toFixed(1) || 'N/A'} μg/m³
              </div>
              <div style={{ color: '#333', fontSize: '1rem' }}>
                <strong style={{ color: '#1976d2' }}>Active Facilities:</strong> {facilities.length}
              </div>
            </div>
            <p style={{ marginTop: '15px', fontSize: '0.95rem', color: '#666' }}>
              <strong>Formula:</strong> Exposure Risk = PM2.5 Concentration ÷ Distance from Facility
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#1976d2', fontSize: '1.8rem', marginBottom: '20px' }}>Your Personal Exposure Analysis</h3>
        
        {exposureData.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {exposureData.map((data, idx) => (
              <div 
                key={idx}
                style={{
                  background: 'white',
                  padding: '25px',
                  borderRadius: '15px',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                  border: `3px solid ${getRiskColor(data.riskLevel)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ color: '#1976d2', fontSize: '1.3rem', margin: 0 }}>
                    {data.facilityName}
                  </h4>
                  <span style={{
                    background: getRiskColor(data.riskLevel),
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {getRiskLabel(data.riskLevel)}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px',
                  marginBottom: '15px',
                  color: '#333',
                  fontSize: '1rem'
                }}>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1976d2' }}>Distance:</strong> {data.distance} miles
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1976d2' }}>PM2.5:</strong> {data.pm25.toFixed(1)} μg/m³
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1976d2' }}>Exposure Score:</strong> {data.exposureScore}
                  </div>
                </div>

                {/* Progress bar for exposure level */}
                <div style={{
                  background: '#f0f0f0',
                  borderRadius: '10px',
                  height: '20px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: `linear-gradient(90deg, ${getRiskColor(data.riskLevel)} 0%, ${getRiskColor(data.riskLevel)}dd 100%)`,
                    width: `${Math.min(100, (data.exposureScore / 100) * 100)}%`,
                    height: '100%',
                    transition: 'width 1s ease'
                  }} />
                </div>

                <div style={{ marginTop: '10px', fontSize: '1rem', color: '#333', fontWeight: '500' }}>
                  {data.riskLevel === 'very_high' && 'Immediate health risk - consider evacuation or protective measures'}
                  {data.riskLevel === 'high' && 'Elevated risk - sensitive groups should take precautions'}
                  {data.riskLevel === 'moderate' && 'Moderate risk - monitor symptoms'}
                  {data.riskLevel === 'low' && 'Low risk - continue normal activities with awareness'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Calculating your exposure risk based on nearby facilities...
          </div>
        )}
          </div>
        </>
      )}

      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        border: '2px solid #e0e0e0',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        marginTop: '30px'
      }}>
        <h4 style={{ color: '#1976d2', marginBottom: '15px', fontSize: '1.3rem' }}>How Exposure Risk is Calculated</h4>
        <div style={{ lineHeight: '1.8', color: '#333', fontSize: '1rem' }}>
          <p style={{ color: '#333' }}><strong style={{ color: '#1976d2' }}>Formula:</strong> Exposure Score = PM2.5 Concentration (μg/m³) ÷ Distance from Facility (miles)</p>
          <p style={{ color: '#333' }}><strong style={{ color: '#1976d2' }}>Interpretation:</strong></p>
          <ul style={{ marginLeft: '20px', color: '#333' }}>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: '#d32f2f' }}>Very High (≥50):</strong> Immediate health risk, PM2.5 concentration very high relative to distance</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: '#f57c00' }}>High (20-49):</strong> Elevated risk, significant exposure for nearby residents</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fbc02d' }}>Moderate (10-19):</strong> Moderate exposure, monitor symptoms</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: '#388e3c' }}>Low (&lt;10):</strong> Lower exposure, continue normal activities with awareness</li>
          </ul>
          <p style={{ marginTop: '15px', fontSize: '1rem', color: '#666' }}>
            This model helps identify which residents are at highest risk based on their proximity to polluting facilities
            and current air quality conditions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExposureModel;

