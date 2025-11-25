import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { shouldUseEmulator } from '../utils/env';


interface AQIDataPoint {
  dt: number;
  pm2_5: number;
}

interface AQIData {
  aqi: number;
  pm25: number;
  location: string;
  timestamp: string;
}

interface ACHDSite {
  site_name: string;
  latitude: number;
  longitude: number;
  pm25?: number;
  aqi?: number;
}

const Dashboard: React.FC = () => {
  const [pm25History, setPm25History] = useState<AQIDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollutant, setSelectedPollutant] = useState<'pm25' | 'ozone' | 'so2'>('pm25');
  const [activeTab, setActiveTab] = useState<'today' | 'overtime' | 'faq'>('today');
  const [currentAQIData, setCurrentAQIData] = useState<AQIData | null>(null);
  const [achdSites, setAchdSites] = useState<ACHDSite[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch ACHD data
        const isDevelopment = shouldUseEmulator();
        const functionsUrl = isDevelopment 
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        
        try {
          const achdResponse = await axios.get(`${functionsUrl}/getACHDAirQuality`, { timeout: 15000 });
          console.log('ACHD Response:', achdResponse.data);
          
          if (achdResponse?.data?.success && achdResponse.data.data?.length > 0) {
            const readings = achdResponse.data.data;
            
            // Known ACHD station locations (Mon Valley)
            const knownStations: { [key: string]: { lat: number; lng: number } } = {
              'Liberty': { lat: 40.291, lng: -79.886 },
              'Liberty 2': { lat: 40.291, lng: -79.886 },
              'Clairton': { lat: 40.292, lng: -79.881 },
              'Avalon': { lat: 40.501, lng: -80.067 },
              'Harrison Township': { lat: 40.583, lng: -79.717 }
            };
            
            // Extract ACHD sites - match location names to known stations
            const sites: ACHDSite[] = readings
              .map((reading: any) => {
                const locationName = reading.location || reading.site_name || 'Unknown';
                // Try to match location name to known stations
                let matchedStation = null;
                for (const [key, coords] of Object.entries(knownStations)) {
                  if (locationName.includes(key) || key.includes(locationName)) {
                    matchedStation = coords;
                    break;
                  }
                }
                
                // Calculate AQI from PM2.5 if not provided
                const pm25 = reading.pm25 || reading.pm2_5;
                let aqi = reading.aqi;
                if (!aqi && pm25) {
                  // EPA AQI calculation for PM2.5
                  if (pm25 <= 12) {
                    aqi = Math.round(((pm25 / 12) * 50));
                  } else if (pm25 <= 35.4) {
                    aqi = Math.round((((pm25 - 12) / (35.4 - 12)) * 49) + 51);
                  } else if (pm25 <= 55.4) {
                    aqi = Math.round((((pm25 - 35.4) / (55.4 - 35.4)) * 49) + 101);
                  } else if (pm25 <= 150.4) {
                    aqi = Math.round((((pm25 - 55.4) / (150.4 - 55.4)) * 99) + 151);
                  } else if (pm25 <= 250.4) {
                    aqi = Math.round((((pm25 - 150.4) / (250.4 - 150.4)) * 99) + 201);
                  } else {
                    aqi = Math.round((((pm25 - 250.4) / (350.4 - 250.4)) * 99) + 301);
                  }
                }
                
                return {
                  site_name: locationName,
                  latitude: matchedStation?.lat || 0,
                  longitude: matchedStation?.lng || 0,
                  pm25: pm25,
                  aqi: aqi || 0
                };
              })
              .filter((site: ACHDSite) => site.site_name !== 'Unknown' && (site.pm25 || site.aqi));
            
            setAchdSites(sites);
            
            // Find the highest AQI reading
            let highestReading = readings[0];
            let highestAQI = 0;
            
            readings.forEach((reading: any) => {
              let aqi = reading.aqi;
              if (!aqi && reading.pm25) {
                // Calculate AQI from PM2.5
                const pm25 = reading.pm25;
                if (pm25 <= 12) {
                  aqi = Math.round(((pm25 / 12) * 50));
                } else if (pm25 <= 35.4) {
                  aqi = Math.round((((pm25 - 12) / (35.4 - 12)) * 49) + 51);
                } else if (pm25 <= 55.4) {
                  aqi = Math.round((((pm25 - 35.4) / (55.4 - 35.4)) * 49) + 101);
                } else if (pm25 <= 150.4) {
                  aqi = Math.round((((pm25 - 55.4) / (150.4 - 55.4)) * 99) + 151);
                } else if (pm25 <= 250.4) {
                  aqi = Math.round((((pm25 - 150.4) / (250.4 - 150.4)) * 99) + 201);
                } else {
                  aqi = Math.round((((pm25 - 250.4) / (350.4 - 250.4)) * 99) + 301);
                }
              }
              
              const finalAQI = aqi || 0;
              if (finalAQI > highestAQI) {
                highestAQI = finalAQI;
                highestReading = reading;
              }
            });
            
            if (highestAQI > 0 || highestReading.pm25) {
              setCurrentAQIData({
                aqi: highestAQI || (highestReading.pm25 ? Math.round(((highestReading.pm25 / 12) * 50)) : 0),
                pm25: highestReading.pm25 || highestReading.pm2_5 || 0,
                location: highestReading.location || highestReading.site_name || 'Mon Valley',
                timestamp: highestReading.timestamp || highestReading.date || new Date().toISOString()
              });
            }
          }
        } catch (err: any) {
          console.error('ACHD fetch failed:', err.message);
        }

        // Fetch historical data for chart (last 7 days)
        try {
          const historyResponse = await axios.get(`${functionsUrl}/getACHDHistoricalData?days=7`, {
            timeout: 15000
          });
          
          if (historyResponse?.data?.success && historyResponse.data.data?.length > 0) {
            const historyData = historyResponse.data.data.map((point: { date: string; pm25: number }) => ({
              dt: new Date(point.date).getTime() / 1000,
              pm2_5: point.pm25
            }));
            setPm25History(historyData);
          } else {
            // Fallback to mock data - include today (i=0) through 6 days ago
            const mockHistory: AQIDataPoint[] = [];
            const now = Math.floor(Date.now() / 1000);
            for (let i = 6; i >= 0; i--) { // Go from oldest (6 days ago) to today (i=0)
              mockHistory.push({
                dt: now - (i * 86400), // 86400 seconds = 1 day
                pm2_5: 30 + Math.random() * 15
              });
            }
            setPm25History(mockHistory);
          }
        } catch (err: any) {
          console.error('Historical data fetch failed:', err.message);
          // Use mock data as fallback - include today through 6 days ago
          const mockHistory: AQIDataPoint[] = [];
          const now = Math.floor(Date.now() / 1000);
          for (let i = 6; i >= 0; i--) { // From oldest to today
            mockHistory.push({
              dt: now - (i * 86400),
              pm2_5: 30 + Math.random() * 15
            });
          }
          setPm25History(mockHistory);
        }

      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg sm:text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  // Get AQI level and color for display
  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return { level: 'Good', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-500' };
    if (aqi <= 100) return { level: 'Moderate', color: 'bg-yellow-400', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-400' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' };
    if (aqi <= 200) return { level: 'Unhealthy', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-500' };
    if (aqi <= 300) return { level: 'Very Unhealthy', color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-500' };
    return { level: 'Hazardous', color: 'bg-red-800', textColor: 'text-red-900', bgColor: 'bg-red-100', borderColor: 'border-red-800' };
  };

  const aqiInfo = currentAQIData ? getAQILevel(currentAQIData.aqi) : null;


  // Pollutant definitions
  const pollutantInfo = {
    pm25: {
      name: 'Fine Particulate Matter (PM2.5)',
      description: 'Fine particulate matter (PM2.5) consists of a mixture of solids and liquid droplets so small they are only visible with an electron microscope. These particles can be inhaled and may contain hundreds of different chemicals - some are released into the air directly, while others form when they react with other pollutants in the atmosphere.',
      causes: 'power plants, motor vehicles, forest fires, and industrial processes',
      sensitiveGroups: 'children, older adults, people with heart disease, and people with lung disease'
    },
    ozone: {
      name: 'Ozone',
      description: 'Ozone (O3) is a gas composed of three oxygen atoms. While ozone high in the atmosphere protects us from harmful UV radiation, ground-level ozone is a harmful air pollutant. It forms when nitrogen oxides (NOx) and volatile organic compounds (VOCs) react in the presence of sunlight, particularly on hot, sunny days.',
      causes: 'motor vehicle exhaust, industrial emissions, gasoline vapors, and chemical solvents',
      sensitiveGroups: 'children, older adults, people with asthma, people with lung disease, and people who are active outdoors'
    },
    so2: {
      name: 'Sulfur Dioxide (SO2)',
      description: 'Sulfur dioxide (SO2) is a colorless gas with a pungent, irritating odor. It is produced primarily from the burning of fossil fuels containing sulfur, particularly coal and oil. SO2 can react with other compounds in the atmosphere to form fine particles that pose health risks.',
      causes: 'coal-fired power plants, industrial facilities, oil refineries, and metal smelting operations',
      sensitiveGroups: 'children, older adults, people with asthma, people with chronic obstructive pulmonary disease (COPD), and people with cardiovascular disease'
    }
  };

  const currentPollutant = pollutantInfo[selectedPollutant];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:h-screen lg:overflow-hidden">
      <div className="flex-shrink-0 py-2 px-2 sm:px-4">
        <h1 className="text-lg sm:text-xl lg:text-2xl text-center text-slate-800 font-bold tracking-tight">
        Community Health Dashboard
      </h1>
      </div>

      {/* Main Grid Layout - 3 columns on desktop, stacked on mobile */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden max-w-[1920px] w-full mx-auto px-2 sm:px-4 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:h-full">
          
          {/* Right Sidebar - AQI Scale - Show first on mobile */}
          <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4 order-1 lg:order-3">
            {/* AQI Scale */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 flex-1 overflow-y-auto">
              <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-2 flex items-center gap-1">
                Air Quality Index (AQI)
                <span className="text-xs text-gray-400">?</span>
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                AQI: The site's current rolling 24-hour average air quality index for PM2.5.
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-1 rounded">
                  <div className="w-4 h-4 bg-green-500 rounded flex-shrink-0"></div>
                  <span className="text-xs text-gray-700">Good</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded">
                  <div className="w-4 h-4 bg-yellow-400 rounded flex-shrink-0"></div>
                  <span className="text-xs text-gray-700">Moderate</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded">
                  <div className="w-4 h-4 bg-orange-500 rounded flex-shrink-0"></div>
                  <span className="text-xs text-gray-700">Unhealthy for Sensitive Groups</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded">
                  <div className="w-4 h-4 bg-red-500 rounded flex-shrink-0"></div>
                  <span className="text-xs text-gray-700">Unhealthy</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded">
                  <div className="w-4 h-4 bg-purple-500 rounded flex-shrink-0"></div>
                  <span className="text-xs text-gray-700">Very Unhealthy</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded">
                  <div className="w-4 h-4 bg-red-800 rounded flex-shrink-0"></div>
                  <span className="text-xs text-gray-700">Hazardous</span>
              </div>
              </div>
            </div>
          </div>

          {/* Left Sidebar - Pollutant Selection & Info */}
          <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4 order-2 lg:order-1">
            {/* Pollutant Selection */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 flex-shrink-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-3 flex items-center gap-1">
                SELECT POLLUTANT
                <span className="text-xs text-gray-400">?</span>
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pollutant" 
                    value="pm25" 
                    checked={selectedPollutant === 'pm25'}
                    onChange={() => setSelectedPollutant('pm25')}
                    className="w-4 h-4 text-slate-600" 
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Fine Particulate Matter (PM2.5)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pollutant" 
                    value="ozone" 
                    checked={selectedPollutant === 'ozone'}
                    onChange={() => setSelectedPollutant('ozone')}
                    className="w-4 h-4 text-slate-600" 
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Ozone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pollutant" 
                    value="so2" 
                    checked={selectedPollutant === 'so2'}
                    onChange={() => setSelectedPollutant('so2')}
                    className="w-4 h-4 text-slate-600" 
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Sulfur Dioxide (SO2)</span>
                </label>
              </div>
        </div>

            {/* Pollutant Info - Dynamic based on selection */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 flex-1 overflow-y-auto">
              <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-2">What is {currentPollutant.name}?</h3>
              <p className="text-xs sm:text-sm text-gray-700 mb-3 leading-relaxed">
                {currentPollutant.description}
              </p>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                <p><strong>Causes:</strong> {currentPollutant.causes}</p>
                <p><strong>Sensitive groups:</strong> {currentPollutant.sensitiveGroups}</p>
              </div>
            </div>

          </div>

          {/* Center - Tableau Dashboard (Map) */}
          <div className="lg:col-span-6 flex flex-col bg-white rounded-lg shadow-md overflow-hidden lg:h-full min-h-[400px] order-3 lg:order-2">
            {/* Tab Navigation */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('today')}
                  className={`flex-1 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                    activeTab === 'today'
                      ? 'text-teal-700 bg-teal-50 border-b-2 border-teal-700'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setActiveTab('overtime')}
                  className={`flex-1 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                    activeTab === 'overtime'
                      ? 'text-teal-700 bg-teal-50 border-b-2 border-teal-700'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Over Time
                </button>
                <button
                  onClick={() => {
                    setActiveTab('faq');
                  }}
                  className={`flex-1 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    activeTab === 'faq'
                      ? 'text-teal-700 bg-teal-50 border-b-2 border-teal-700'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  FAQ
                </button>
              </div>
            </div>

            {/* Tab Content - Key forces complete remount when switching tabs to prevent iframe persistence */}
            <div key={activeTab} className="flex-1 overflow-hidden min-h-0 flex flex-col">
              {activeTab === 'today' && (
                <div className="flex-1 overflow-hidden min-h-0 px-2 pb-2">
                  <iframe
                    key="today-view"
                    src="https://tableau.alleghenycounty.us/t/PublicSite/views/AlleghenyCountyAirQuality/Today?:embed=y&:showVizHome=no&:hideTabs=y&:toolbar=no&:device=phone&:display_count=no&:showShareOptions=false&:origin=vizql&:tabs=no&:showAppBanner=false&:loadOrderID=0"
                    className="w-full h-full border-0"
                    title="Allegheny County Air Quality Dashboard"
                    allowFullScreen
                    style={{ display: 'block' }}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                </div>
              )}

              {activeTab === 'overtime' && (
                <div className="flex-1 overflow-hidden min-h-0 px-2 pb-2">
                  <iframe
                    key="overtime-view"
                    src="https://tableau.alleghenycounty.us/t/PublicSite/views/AlleghenyCountyAirQuality/OverTime?:embed=y&:showVizHome=no&:hideTabs=y&:toolbar=no&:device=phone&:display_count=no&:showShareOptions=false&:origin=vizql&:tabs=no&:showAppBanner=false&:loadOrderID=0"
                    className="w-full h-full border-0"
                    title="Allegheny County Air Quality Trends"
                    allowFullScreen
                    style={{ display: 'block' }}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 bg-white">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-3">Frequently Asked Questions</h3>
                      <div className="space-y-4 text-xs sm:text-sm text-gray-700">
                        <div className="pb-3 border-b border-gray-200">
                          <p className="font-semibold mb-2 text-slate-800">What is the Air Quality Index (AQI)?</p>
                          <p className="leading-relaxed">The AQI is a scale used to report daily air quality. It tells you how clean or polluted your air is, and what associated health effects might be a concern for you.</p>
                        </div>
                        <div className="pb-3 border-b border-gray-200">
                          <p className="font-semibold mb-2 text-slate-800">How is AQI calculated?</p>
                          <p className="leading-relaxed">AQI is calculated based on the highest value of five major air pollutants regulated by the Clean Air Act: ground-level ozone, particle pollution (PM2.5 and PM10), carbon monoxide, sulfur dioxide, and nitrogen dioxide.</p>
                        </div>
                        <div className="pb-3 border-b border-gray-200">
                          <p className="font-semibold mb-2 text-slate-800">What should I do when air quality is unhealthy?</p>
                          <p className="leading-relaxed">When air quality is unhealthy, sensitive groups should reduce prolonged or heavy exertion outdoors. Everyone should consider reducing outdoor activities, especially during peak pollution hours.</p>
                        </div>
                        <div className="pb-3 border-b border-gray-200">
                          <p className="font-semibold mb-2 text-slate-800">Where does this data come from?</p>
                          <p className="leading-relaxed">This data comes from official monitoring stations operated by the Allegheny County Health Department (ACHD) and is updated regularly throughout the day.</p>
                        </div>
                        <div className="pb-3 border-b border-gray-200">
                          <p className="font-semibold mb-2 text-slate-800">How often is the data updated?</p>
                          <p className="leading-relaxed">Air quality data is typically updated hourly. The timestamp shown indicates when the most recent reading was taken.</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-2 text-slate-800">What do the different AQI levels mean?</p>
                          <p className="leading-relaxed mb-2">The AQI is divided into six categories:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Good (0-50):</strong> Air quality is satisfactory, and air pollution poses little or no risk.</li>
                            <li><strong>Moderate (51-100):</strong> Air quality is acceptable; however, some pollutants may be a moderate health concern for a very small number of people.</li>
                            <li><strong>Unhealthy for Sensitive Groups (101-150):</strong> Members of sensitive groups may experience health effects.</li>
                            <li><strong>Unhealthy (151-200):</strong> Everyone may begin to experience health effects.</li>
                            <li><strong>Very Unhealthy (201-300):</strong> Health alert: everyone may experience more serious health effects.</li>
                            <li><strong>Hazardous (301+):</strong> Health warning of emergency conditions.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default Dashboard;
