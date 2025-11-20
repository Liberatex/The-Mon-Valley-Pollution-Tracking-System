import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { shouldUseEmulator } from '../utils/env';
import { FadeInSection } from './ui/FadeInSection';
import { FileText, AlertTriangle, MapPin, ArrowRight, Navigation, CheckCircle2 } from 'lucide-react';

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

interface ExposureModelProps {
  onNavigate?: (view: 'symptoms' | 'home' | 'dashboard' | 'map' | 'ai' | 'exposure') => void;
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

const ExposureModel: React.FC<ExposureModelProps> = ({ onNavigate }) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Calculating exposure risks...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - Full Width */}
      <FadeInSection delay={0}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white w-screen text-center py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Exposure Risk Model
              </h2>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl opacity-90 font-light max-w-3xl mx-auto mb-6">
              Calculate your personalized exposure risk based on location and air quality
            </p>
            
            {/* Call to Action to Report Symptoms */}
            <div className="mt-8">
              <p className="text-base sm:text-lg opacity-90 mb-4">Experiencing symptoms? Help us track health impacts.</p>
              <button
                onClick={() => onNavigate?.('symptoms')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm border border-white/20"
              >
                <FileText className="w-5 h-5" />
                Report Symptoms
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Content Section with Container */}
      <div className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Location Input Section */}
          <FadeInSection delay={0.2}>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-slate-600" />
                Enter Your Location
              </h3>
              <p className="text-gray-600 mb-6">
                Get personalized exposure risk analysis based on your location relative to industrial facilities.
              </p>

              {userLocation ? (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-5 rounded-xl mb-6 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <strong className="text-lg text-slate-800 block mb-2">
                        {userLocation.address || `Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
                      </strong>
                      <span className="text-sm text-gray-600">
                        Exposure analysis will be calculated for this location
                      </span>
                    </div>
                    <button
                      onClick={handleResetLocation}
                      className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors text-sm"
                    >
                      Change Location
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleUseGeolocation}
                    disabled={gettingLocation}
                    className="w-full px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    {gettingLocation ? 'Getting your location...' : 'Use My Current Location'}
                  </button>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Enter address (e.g., Clairton, PA) or coordinates (e.g., 40.292,-79.881)"
                      className="flex-1 min-w-[200px] px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-slate-600 transition-colors bg-white"
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
                      className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl whitespace-nowrap"
                    >
                      {gettingLocation ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {locationError && (
                    <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl text-red-700 text-sm">
                      {locationError}
                    </div>
                  )}

                  <p className="text-sm text-gray-500 mt-2">
                    You can enter an address (e.g., "Clairton, PA") or coordinates (e.g., "40.292,-79.881")
                  </p>
                </div>
              )}
            </div>
          </FadeInSection>

          {/* Show results only if location is set */}
          {!userLocation && (
            <FadeInSection delay={0.3}>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 sm:p-12 text-center mb-8">
                <p className="text-lg text-gray-700 mb-4">
                  Enter your location above to see personalized exposure risk analysis.
                </p>
                <p className="text-base text-gray-500">
                  Your exposure risk is calculated based on your proximity to industrial facilities and current air quality conditions.
                </p>
              </div>
            </FadeInSection>
          )}

          {userLocation && (
            <>
              <FadeInSection delay={0.3}>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">Current Conditions at Your Location</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                    <div className="text-gray-700">
                      <strong className="text-slate-700 block mb-1">Current AQI:</strong>
                      <span className="text-lg font-semibold text-slate-800">{currentAQI || 'N/A'}</span>
                    </div>
                    <div className="text-gray-700">
                      <strong className="text-slate-700 block mb-1">Current PM2.5:</strong>
                      <span className="text-lg font-semibold text-slate-800">{currentPM25?.toFixed(1) || 'N/A'} μg/m³</span>
                    </div>
                    <div className="text-gray-700">
                      <strong className="text-slate-700 block mb-1">Active Facilities:</strong>
                      <span className="text-lg font-semibold text-slate-800">{facilities.length}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong className="text-slate-700">Formula:</strong> Exposure Risk = PM2.5 Concentration ÷ Distance from Facility
                    </p>
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection delay={0.4}>
                <div className="mb-8">
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Your Personal Exposure Analysis</h3>
        
                  {exposureData.length > 0 ? (
                    <div className="grid gap-6">
                      {exposureData.map((data, idx) => (
                        <div 
                          key={idx}
                          className="bg-white rounded-2xl shadow-lg border-2 p-6"
                          style={{ borderColor: getRiskColor(data.riskLevel) }}
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                            <h4 className="text-xl sm:text-2xl font-bold text-slate-800">
                              {data.facilityName}
                            </h4>
                            <span 
                              className="px-4 py-2 rounded-full text-white font-bold text-sm"
                              style={{ backgroundColor: getRiskColor(data.riskLevel) }}
                            >
                              {getRiskLabel(data.riskLevel)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="text-gray-700">
                              <strong className="text-slate-700 block mb-1">Distance:</strong>
                              <span className="text-lg font-semibold text-slate-800">{data.distance.toFixed(2)} miles</span>
                            </div>
                            <div className="text-gray-700">
                              <strong className="text-slate-700 block mb-1">PM2.5:</strong>
                              <span className="text-lg font-semibold text-slate-800">{data.pm25.toFixed(1)} μg/m³</span>
                            </div>
                            <div className="text-gray-700">
                              <strong className="text-slate-700 block mb-1">Exposure Score:</strong>
                              <span className="text-lg font-semibold text-slate-800">{data.exposureScore.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Progress bar for exposure level */}
                          <div className="bg-gray-200 rounded-full h-5 overflow-hidden mb-4">
                            <div 
                              className="h-full transition-all duration-1000 ease-out"
                              style={{
                                backgroundColor: getRiskColor(data.riskLevel),
                                width: `${Math.min(100, (data.exposureScore / 100) * 100)}%`
                              }}
                            />
                          </div>

                          <div className="mt-4 text-base text-gray-700 font-medium">
                            {data.riskLevel === 'very_high' && '⚠️ Immediate health risk - consider evacuation or protective measures'}
                            {data.riskLevel === 'high' && '🔴 Elevated risk - sensitive groups should take precautions'}
                            {data.riskLevel === 'moderate' && '🟡 Moderate risk - monitor symptoms'}
                            {data.riskLevel === 'low' && '🟢 Low risk - continue normal activities with awareness'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600">
                      Calculating your exposure risk based on nearby facilities...
                    </div>
                  )}
                </div>
              </FadeInSection>
              
              {/* Call to Action to Report Symptoms */}
              <FadeInSection delay={0.5}>
                <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl shadow-lg border border-blue-200 p-8 mb-8 text-center">
                  <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center justify-center gap-2">
                    <FileText className="w-6 h-6 text-slate-600" />
                    Experiencing Symptoms?
                  </h3>
                  <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                    If you're experiencing health symptoms related to air quality exposure, help us track these impacts by reporting your symptoms. Your data helps build evidence for advocacy and regulatory action.
                  </p>
                  <button
                    onClick={() => onNavigate?.('symptoms')}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white rounded-xl font-bold transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <FileText className="w-5 h-5" />
                    Report Your Symptoms
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </FadeInSection>
          </div>
        </>
      )}

              {/* How It Works Section */}
              <FadeInSection delay={0.6}>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">How Exposure Risk is Calculated</h4>
                  <div className="space-y-4 text-gray-700">
                    <p>
                      <strong className="text-slate-700">Formula:</strong> Exposure Score = PM2.5 Concentration (μg/m³) ÷ Distance from Facility (miles)
                    </p>
                    <p>
                      <strong className="text-slate-700">Interpretation:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong className="text-red-600">Very High (≥50):</strong> Immediate health risk, PM2.5 concentration very high relative to distance</li>
                      <li><strong className="text-orange-600">High (20-49):</strong> Elevated risk, significant exposure for nearby residents</li>
                      <li><strong className="text-yellow-600">Moderate (10-19):</strong> Moderate exposure, monitor symptoms</li>
                      <li><strong className="text-green-600">Low (&lt;10):</strong> Lower exposure, continue normal activities with awareness</li>
                    </ul>
                    <p className="mt-4 text-gray-600">
                      This model helps identify which residents are at highest risk based on their proximity to polluting facilities
                      and current air quality conditions.
                    </p>
                  </div>
                </div>
              </FadeInSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExposureModel;

