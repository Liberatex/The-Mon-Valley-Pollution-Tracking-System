import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { shouldUseEmulator, env } from '../utils/env';
import { FadeInSection } from './ui/FadeInSection';
import { FileText, AlertTriangle, MapPin, ArrowRight, Navigation } from 'lucide-react';
import { calculateWeightedRisk, calculateVulnerabilityScore } from '../services/weightedRiskAlgorithm';
import { getWindData, calculateDispersionFactor } from '../services/windDataService';
import { applyBarkjohnCalibration } from '../services/barkjohnCalibration';

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
  pm25Calibrated?: number;
  exposureScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  weightedRisk?: any; // Weighted Risk Algorithm result
  toxicityWeight?: number;
  dispersionFactor?: number;
}

interface ExposureModelProps {
  onNavigate?: (view: 'symptoms' | 'home' | 'map' | 'ai' | 'exposure') => void; // 'dashboard' removed
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
// Legacy function - kept for backward compatibility
// New code should use calculateWeightedRisk from weightedRiskAlgorithm service
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
  const [currentPM25Raw, setCurrentPM25Raw] = useState<number | null>(null);
  const [currentPM25Calibrated, setCurrentPM25Calibrated] = useState<number | null>(null);
  const [weightedRiskIndex, setWeightedRiskIndex] = useState<number | null>(null);
  const [weightedRiskLevel, setWeightedRiskLevel] = useState<string>('low');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [locationInput, setLocationInput] = useState<string>('');
  const [locationMethod, setLocationMethod] = useState<'geolocation' | 'address' | 'coordinates' | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const isRequestingLocation = useRef<boolean>(false);

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
        const OWM_API_KEY = env.OPENWEATHER_API_KEY || process.env.REACT_APP_OWM_API_KEY || '';
        const aqResp = await axios.get(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${location.lat}&lon=${location.lng}&appid=${OWM_API_KEY}`
        );
        if (!isMounted) return;
        const rawPM25 = aqResp.data?.list?.[0]?.components?.pm2_5 ?? null;
        if (rawPM25 !== null) {
          setCurrentPM25Raw(rawPM25);
          // Apply Barkjohn calibration
          const calibrated = applyBarkjohnCalibration(rawPM25, 50, undefined);
          setCurrentPM25Calibrated(calibrated.correctedPM);
        }
      } catch (err) {
        console.warn('Air quality fetch failed, using fallback.', err);
        if (isMounted) {
          setCurrentPM25Raw(35.0);
          const calibrated = applyBarkjohnCalibration(35.0, 50, undefined);
          setCurrentPM25Calibrated(calibrated.correctedPM);
        }
      }
    }
    loadAirQuality();
    return () => { isMounted = false; };
  }, [userLocation]);

  // Compute exposure using Weighted Risk Algorithm (VCAN requirement)
  useEffect(() => {
    if (!userLocation) {
      setExposureData([]);
      setWeightedRiskIndex(null);
      return;
    }

    // Allow calculation even if PM2.5 or facilities are missing (use defaults)
    const hasPM25 = currentPM25Calibrated !== null && currentPM25Calibrated !== undefined;
    const hasFacilities = facilities.length > 0;
    
    if (!hasPM25 && !hasFacilities) {
      // No data at all - can't calculate
      setExposureData([]);
      setWeightedRiskIndex(null);
      return;
    }

    const calculateWeightedRiskForFacilities = async () => {
      try {
        // Get wind data for dispersion factor
        const wind = await getWindData(userLocation.lat, userLocation.lng, env.OPENWEATHER_API_KEY);
        const dispersionFactor = wind ? calculateDispersionFactor(wind.speed) : 1.0;

        // Get TRI facilities for toxicity weights
        const baseUrl = shouldUseEmulator()
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        
        let triFacilities: any[] = [];
        try {
          const triResponse = await axios.get(`${baseUrl}/getTRIFacilities`);
          if (triResponse.data?.success && triResponse.data.facilities) {
            triFacilities = triResponse.data.facilities;
          }
        } catch (err) {
          console.warn('Could not fetch TRI facilities, using defaults');
        }

        // Calculate vulnerability score (default to 1.0 for now)
        const vulnerabilityScore = calculateVulnerabilityScore(false, false, 'adult', false);

        // Use already-calibrated PM2.5 (from loadAirQuality effect)
        // Default to 35.0 if not available (typical Mon Valley baseline)
        const calibratedPM = currentPM25Calibrated !== null && currentPM25Calibrated !== undefined ? currentPM25Calibrated : 35.0;

        // Calculate overall weighted risk index for user location
        // Use average toxicity weight from nearby facilities
        let avgToxicityWeight = 1.0;
        if (wind && triFacilities.length > 0) {
          const nearbyFacilities = facilities
            .filter((f: any) => {
              if (!f.location?.lat || !f.location?.lng) return false;
              const dist = calculateDistance(userLocation.lat, userLocation.lng, f.location.lat, f.location.lng);
              return dist < 10; // Within 10 miles
            });
          
          if (nearbyFacilities.length > 0) {
            const toxicityWeights = nearbyFacilities.map((facility: any) => {
              const matchingFacility = triFacilities.find(
                (tf: any) => tf.facilityId === facility.facilityId || tf.name === facility.name
              );
              return matchingFacility?.totalToxicityScore ? Math.min(2.0, 1.0 + (matchingFacility.totalToxicityScore / 20)) : 1.0;
            });
            avgToxicityWeight = toxicityWeights.reduce((sum, w) => sum + w, 0) / toxicityWeights.length;
          }
        }

        // Calculate overall weighted risk for user location
        const overallRiskResult = calculateWeightedRisk({
          pm25Calibrated: calibratedPM,
          toxicityWeight: avgToxicityWeight,
          dispersionFactor,
          odorScore: 0, // No smell data in ExposureModel
          odorWeight: 1.2, // Use standard odor weight
          vulnerabilityScore,
        });
        
        setWeightedRiskIndex(overallRiskResult.riskIndex);
        setWeightedRiskLevel(overallRiskResult.riskLevel);

        // Calculate exposure for facilities (or return empty if no facilities)
        const facilitiesToProcess = facilities.length > 0 
          ? facilities.filter((f: any) => f.location?.lat && f.location?.lng)
          : [];
        
        const exposure = facilitiesToProcess.length > 0 ? await Promise.all(
          facilitiesToProcess
            .map(async (facility: any) => {
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                facility.location.lat,
                facility.location.lng
              );

              // Get toxicity weight for this facility
              let toxicityWeight = 1.0;
              if (wind && triFacilities.length > 0) {
                const matchingFacility = triFacilities.find(
                  (tf: any) => tf.facilityId === facility.facilityId || tf.name === facility.name
                );
                if (matchingFacility) {
                  // Calculate toxicity weight from TRI data
                  toxicityWeight = Math.min(2.0, 1.0 + (matchingFacility.totalToxicityScore / 20));
                }
              }

              // Calculate Weighted Risk for this facility
              const riskResult = calculateWeightedRisk({
                pm25Calibrated: calibratedPM,
                toxicityWeight,
                dispersionFactor,
                odorScore: 0, // No smell data in ExposureModel
                odorWeight: 1.2, // Use standard odor weight
                vulnerabilityScore,
              });

              // Map Weighted Risk levels to legacy format for compatibility
              let legacyRiskLevel: 'low' | 'moderate' | 'high' | 'very_high' = 'low';
              if (riskResult.riskLevel === 'toxic' || riskResult.riskLevel === 'severe') {
                legacyRiskLevel = 'very_high';
              } else if (riskResult.riskLevel === 'high') {
                legacyRiskLevel = 'high';
              } else if (riskResult.riskLevel === 'elevated') {
                legacyRiskLevel = 'moderate';
              }

              return {
                location: { lat: userLocation.lat, lng: userLocation.lng },
                facilityId: facility.facilityId,
                facilityName: facility.name,
                distance: Math.round(distance * 10) / 10,
                pm25: currentPM25Raw || 0,
                pm25Calibrated: calibratedPM,
                exposureScore: Math.round(riskResult.riskIndex * 10) / 10,
                riskLevel: legacyRiskLevel,
                weightedRisk: riskResult,
                toxicityWeight,
                dispersionFactor,
              };
            })
        ) : [];

        exposure.sort((a: any, b: any) => b.exposureScore - a.exposureScore);
        setExposureData(exposure);
      } catch (err) {
        console.error('Weighted Risk calculation failed:', err);
        setWeightedRiskIndex(null);
        setExposureData([]);
      }
    };

    calculateWeightedRiskForFacilities();
  }, [facilities, currentPM25Calibrated, currentPM25Raw, userLocation]);

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
  const handleUseGeolocation = async () => {
    // Prevent multiple simultaneous requests
    if (isRequestingLocation.current) {
      return;
    }

    setGettingLocation(true);
    setLocationError(null);
    setLocationMethod('geolocation');
    setPermissionDenied(false);
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setGettingLocation(false);
      return;
    }

    // Mark that we're requesting location
    isRequestingLocation.current = true;

    // Direct geolocation request - browser will show permission prompt
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ ExposureModel location received:', position.coords.latitude, position.coords.longitude);
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationError(null);
        setPermissionDenied(false);
        setGettingLocation(false);
        isRequestingLocation.current = false;
      },
      (error) => {
        // Don't log permission denied errors - they're expected
        if (error.code !== error.PERMISSION_DENIED) {
          console.error('Geolocation error:', error);
        }
        
        // Only show error if not permission denied (user can enable in browser settings)
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
          // Don't set error message - user needs to enable in browser settings
        } else {
          setLocationError('Could not get your location. Please try entering your address manually.');
        }
        
        setGettingLocation(false);
        isRequestingLocation.current = false;
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 0
      }
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
      const OWM_API_KEY = env.OPENWEATHER_API_KEY || process.env.REACT_APP_OWM_API_KEY || process.env.VITE_OPENWEATHER_API_KEY || '';
      
      if (!OWM_API_KEY) {
        setLocationError('Geocoding service is not configured. Please use coordinates instead (e.g., 40.292,-79.881).');
        setGettingLocation(false);
        return;
      }

      const geocodeResp = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationInput)}&limit=1&appid=${OWM_API_KEY}`,
        { timeout: 10000 }
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
        setLocationError('Address not found. Please try a different address or use coordinates (e.g., 40.292,-79.881).');
      }
    } catch (err: any) {
      console.error('Geocoding error:', err);
      if (err.response?.status === 401) {
        setLocationError('Geocoding service authentication failed. Please use coordinates instead (e.g., 40.292,-79.881).');
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setLocationError('Request timed out. Please try again or use coordinates.');
      } else {
        setLocationError('Could not find that address. Please try again or use coordinates (e.g., 40.292,-79.881).');
      }
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
    setCurrentPM25Raw(null);
    setCurrentPM25Calibrated(null);
    setWeightedRiskIndex(null);
    setWeightedRiskLevel('low');
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
                      <strong className="text-slate-700 block mb-1">Weighted Risk Index:</strong>
                      <span className={`text-lg font-semibold ${
                        weightedRiskIndex === null ? 'text-slate-800' :
                        weightedRiskIndex < 25 ? 'text-green-600' :
                        weightedRiskIndex < 50 ? 'text-yellow-600' :
                        weightedRiskIndex < 75 ? 'text-orange-600' :
                        weightedRiskIndex < 100 ? 'text-red-600' : 'text-purple-600'
                      }`}>
                        {weightedRiskIndex !== null ? weightedRiskIndex.toFixed(1) : 'Calculating...'}
                      </span>
                      {weightedRiskIndex !== null && (
                        <span className="text-xs text-gray-500 block mt-1 capitalize">{weightedRiskLevel} Risk</span>
                      )}
                    </div>
                    <div className="text-gray-700">
                      <strong className="text-slate-700 block mb-1">PM2.5 (Calibrated):</strong>
                      <span className="text-lg font-semibold text-slate-800">{currentPM25Calibrated?.toFixed(1) || 'N/A'} μg/m³</span>
                      {currentPM25Raw && currentPM25Calibrated && (
                        <span className="text-xs text-gray-500 block mt-1">Raw: {currentPM25Raw.toFixed(1)} μg/m³</span>
                      )}
                    </div>
                    <div className="text-gray-700">
                      <strong className="text-slate-700 block mb-1">Nearby Facilities:</strong>
                      <span className="text-lg font-semibold text-slate-800">{facilities.length}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong className="text-slate-700">Formula:</strong> Risk Index = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Where: PM_cal = Barkjohn-calibrated PM2.5, W_tox = Toxicity Weight (EPA TRI), W_wind = Dispersion Factor, Odor_score = Smell PGH reports, W_odor = Gas Proxy Weight (1.2), V_user = Vulnerability Multiplier
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
                              <span className="text-lg font-semibold text-slate-800">
                                {data.pm25Calibrated ? `${data.pm25Calibrated.toFixed(1)} μg/m³` : `${data.pm25.toFixed(1)} μg/m³`}
                                {data.pm25Calibrated && data.pm25Calibrated !== data.pm25 && (
                                  <span className="text-xs text-gray-500 ml-1">(calibrated)</span>
                                )}
                              </span>
                            </div>
                            <div className="text-gray-700">
                              <strong className="text-slate-700 block mb-1">Risk Index:</strong>
                              <span className="text-lg font-semibold text-slate-800">
                                {data.weightedRisk?.riskIndex?.toFixed(1) || data.exposureScore.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Show weighted risk breakdown if available */}
                          {data.weightedRisk && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">Toxicity Weight:</span>
                                  <span className="font-semibold text-slate-800 ml-1">{data.toxicityWeight?.toFixed(2) || '1.00'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Dispersion:</span>
                                  <span className="font-semibold text-slate-800 ml-1">{data.dispersionFactor?.toFixed(2) || '1.00'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">PM Component:</span>
                                  <span className="font-semibold text-slate-800 ml-1">{data.weightedRisk.components?.pmComponent?.toFixed(1) || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Confidence:</span>
                                  <span className="font-semibold text-slate-800 ml-1 capitalize">{data.weightedRisk.confidence || 'medium'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Progress bar for exposure level */}
                          <div className="bg-gray-200 rounded-full h-5 overflow-hidden mb-4">
                            <div 
                              className="h-full transition-all duration-1000 ease-out"
                              style={{
                                backgroundColor: data.weightedRisk?.riskColor === 'purple' ? '#9c27b0' :
                                                 data.weightedRisk?.riskColor === 'red' ? '#d32f2f' :
                                                 data.weightedRisk?.riskColor === 'orange' ? '#f57c00' :
                                                 data.weightedRisk?.riskColor === 'yellow' ? '#fbc02d' :
                                                 data.weightedRisk?.riskColor === 'green' ? '#388e3c' :
                                                 getRiskColor(data.riskLevel),
                                width: `${Math.min(100, ((data.weightedRisk?.riskIndex || data.exposureScore) / 100) * 100)}%`
                              }}
                            />
                          </div>

                          {/* Show weighted risk recommendation if available, otherwise fallback to legacy */}
                          {data.weightedRisk?.recommendation ? (
                            <div className="mt-4 text-base text-gray-700 font-medium p-3 bg-blue-50 rounded-lg border-l-4" 
                                 style={{ borderColor: data.weightedRisk.riskColor === 'purple' ? '#9c27b0' :
                                                       data.weightedRisk.riskColor === 'red' ? '#d32f2f' :
                                                       data.weightedRisk.riskColor === 'orange' ? '#f57c00' :
                                                       data.weightedRisk.riskColor === 'yellow' ? '#fbc02d' : '#388e3c' }}>
                              {data.weightedRisk.recommendation}
                            </div>
                          ) : (
                            <div className="mt-4 text-base text-gray-700 font-medium">
                              {data.riskLevel === 'very_high' && '⚠️ Immediate health risk - consider evacuation or protective measures'}
                              {data.riskLevel === 'high' && '🔴 Elevated risk - sensitive groups should take precautions'}
                              {data.riskLevel === 'moderate' && '🟡 Moderate risk - monitor symptoms'}
                              {data.riskLevel === 'low' && '🟢 Low risk - continue normal activities with awareness'}
                            </div>
                          )}
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
            </>
          )}

          {/* How It Works Section */}
          <FadeInSection delay={0.6}>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <h4 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">How Exposure Risk is Calculated</h4>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong className="text-slate-700">Weighted Risk Algorithm:</strong> This uses the VCAN Weighted Risk Index, which goes beyond standard AQI to account for multiple factors:
                </p>
                <p className="font-semibold text-slate-800">Risk = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user</p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                  <li><strong className="text-slate-700">PM_cal:</strong> Barkjohn-corrected PM2.5 (accounts for humidity)</li>
                  <li><strong className="text-slate-700">W_tox:</strong> Toxicity weight based on nearby industrial facilities (EPA TRI data)</li>
                  <li><strong className="text-slate-700">W_wind:</strong> Dispersion factor (stagnant air = higher risk)</li>
                  <li><strong className="text-slate-700">V_user:</strong> Personal vulnerability (health factors)</li>
                </ul>
                <p>
                  <strong className="text-slate-700">Risk Levels:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong className="text-purple-600">Toxic (Purple):</strong> Immediate alert - likely industrial upset event</li>
                  <li><strong className="text-red-600">Severe (Red):</strong> All users should shelter in place</li>
                  <li><strong className="text-orange-600">High (Orange):</strong> Sensitive individuals shelter in place</li>
                  <li><strong className="text-yellow-600">Elevated (Yellow):</strong> Safe for general public, sensitive users prepare</li>
                  <li><strong className="text-green-600">Low (Green):</strong> Safe for all</li>
                </ul>
                <p className="mt-4 text-gray-600">
                  This advanced model provides personalized risk assessment that accounts for chemical toxicity, wind patterns, and your personal health factors.
                </p>
              </div>
            </div>
          </FadeInSection>
        </div>
      </div>
    </div>
  );
};

export default ExposureModel;

