import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

  // Load data in two independent steps to avoid race conditions on some devices
  useEffect(() => {
    let isMounted = true;
    async function loadFacilities() {
      try {
        const isDevelopment = process.env.REACT_APP_USE_EMULATOR === 'true';
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
    async function loadAirQuality() {
      try {
        const CLAIRTON_LAT = 40.292;
        const CLAIRTON_LNG = -79.881;
        const OWM_API_KEY = process.env.REACT_APP_OWM_API_KEY || '';
        const aqResp = await axios.get(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${CLAIRTON_LAT}&lon=${CLAIRTON_LNG}&appid=${OWM_API_KEY}`
        );
        if (!isMounted) return;
        setCurrentAQI(aqResp.data?.list?.[0]?.main?.aqi || null);
        setCurrentPM25(aqResp.data?.list?.[0]?.components?.pm2_5 ?? 35.0);
      } catch (err) {
        console.warn('Air quality fetch failed, using fallback.', err);
        if (isMounted) setCurrentPM25(35.0);
      }
    }
    setLoading(true);
    setError(null);
    Promise.all([loadFacilities(), loadAirQuality()])
      .finally(() => setLoading(false));
    return () => { isMounted = false; };
  }, []);

  // Compute exposure whenever inputs are ready
  useEffect(() => {
    const CLAIRTON_LAT = 40.292;
    const CLAIRTON_LNG = -79.881;
    if (!currentPM25 || facilities.length === 0) {
      setExposureData([]);
      return;
    }
    try {
      const exposure = facilities
        .filter((f: any) => f.location?.lat && f.location?.lng)
        .map((facility: any) => {
          const distance = calculateDistance(
            CLAIRTON_LAT,
            CLAIRTON_LNG,
            facility.location.lat,
            facility.location.lng
          );
          const { score, riskLevel } = calculateExposureScore(currentPM25, distance);
          return {
            location: { lat: CLAIRTON_LAT, lng: CLAIRTON_LNG },
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
  }, [facilities, currentPM25]);

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

      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        color: '#333',
        marginBottom: '30px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
        border: '2px solid #e0e0e0'
      }}>
        <h3 style={{ marginBottom: '15px', fontSize: '1.5rem', color: '#1976d2' }}>Current Conditions</h3>
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
        <h3 style={{ color: '#1976d2', fontSize: '1.8rem', marginBottom: '20px' }}>Facility Exposure Analysis</h3>
        
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
                  {data.riskLevel === 'very_high' && '⚠️ Immediate health risk - consider evacuation or protective measures'}
                  {data.riskLevel === 'high' && '⚠️ Elevated risk - sensitive groups should take precautions'}
                  {data.riskLevel === 'moderate' && '⚡ Moderate risk - monitor symptoms'}
                  {data.riskLevel === 'low' && '✅ Low risk - continue normal activities with awareness'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No exposure data available. Loading facilities...
          </div>
        )}
      </div>

      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        border: '2px solid #e0e0e0',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
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

