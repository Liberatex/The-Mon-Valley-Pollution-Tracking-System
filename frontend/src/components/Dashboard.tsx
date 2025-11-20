import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FadeInSection } from './ui/FadeInSection';
import { shouldUseEmulator } from '../utils/env';

interface DashboardStats {
  avgPM25: number;
  sensorCount: number;
  reportCount: number;
}

interface AQIDataPoint {
  dt: number;
  pm2_5: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pm25History, setPm25History] = useState<AQIDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollutant, setSelectedPollutant] = useState<'pm25' | 'ozone' | 'so2'>('pm25');
  const [activeTab, setActiveTab] = useState<'today' | 'overtime' | 'faq'>('today');

  useEffect(() => {
    async function fetchData() {
      try {
        // Set stats
        setStats({ avgPM25: 35.2, sensorCount: 239, reportCount: 0 });

        // Fetch ACHD data
        const isDevelopment = shouldUseEmulator();
        const functionsUrl = isDevelopment 
          ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
          : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
        
        try {
          const achdResponse = await axios.get(`${functionsUrl}/getACHDAirQuality`, { timeout: 15000 });
          console.log('ACHD Response:', achdResponse.data);
          
          if (achdResponse?.data?.success && achdResponse.data.data?.length > 0) {
            const reading = achdResponse.data.data[0];
            console.log('ACHD reading:', reading);
            // AQI data available for future use
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

  // AQI level calculation (kept for potential future use)
  // const aqiLevel = aqi && aqi > 0 ? (aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for Sensitive' : 'Unhealthy') : 'Unknown';

  // Get AQI level and color
  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return { level: 'Good', color: 'bg-green-500', textColor: 'text-green-700' };
    if (aqi <= 100) return { level: 'Moderate', color: 'bg-yellow-400', textColor: 'text-yellow-700' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', textColor: 'text-orange-700' };
    if (aqi <= 200) return { level: 'Unhealthy', color: 'bg-red-500', textColor: 'text-red-700' };
    if (aqi <= 300) return { level: 'Very Unhealthy', color: 'bg-purple-500', textColor: 'text-purple-700' };
    return { level: 'Hazardous', color: 'bg-red-800', textColor: 'text-red-900' };
  };

  // Mock AQI for display (replace with real data when available)
  const currentAQI = 65;
  const aqiInfo = getAQILevel(currentAQI);

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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 py-2 px-2 sm:px-4">
        <h1 className="text-lg sm:text-xl lg:text-2xl text-center text-slate-800 font-bold tracking-tight">
        Community Health Dashboard
      </h1>
      </div>

      {/* Main Grid Layout - 3 columns on desktop, stacked on mobile */}
      <div className="flex-1 overflow-hidden max-w-[1920px] w-full mx-auto px-2 sm:px-4 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 h-full">
          
          {/* Left Sidebar - Pollutant Selection & Info */}
          <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4">
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

            {/* Stats Cards - Mobile only */}
            {stats && (
              <div className="lg:hidden grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg shadow-md p-3 text-center">
                  <div className="text-xl font-bold text-slate-700">{stats.sensorCount}</div>
                  <div className="text-xs text-gray-600">Sensors</div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3 text-center">
                  <div className="text-xl font-bold text-slate-700">{stats.reportCount}</div>
                  <div className="text-xs text-gray-600">Reports</div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3 text-center">
                  <div className="text-xl font-bold text-slate-700">{stats.avgPM25.toFixed(1)}</div>
                  <div className="text-xs text-gray-600">PM2.5</div>
                </div>
              </div>
            )}
          </div>

          {/* Center - Tableau Dashboard (Map) */}
          <div className="lg:col-span-6 flex flex-col bg-white rounded-lg shadow-md overflow-hidden h-full">
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
                  onClick={() => setActiveTab('faq')}
                  disabled={false}
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

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
              {activeTab === 'today' && (
                <>
                  <div className="px-2 pt-2 pb-1 flex-shrink-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-800">{currentPollutant.name} Monitor Locations</h3>
                    <p className="text-xs text-gray-600">Click location on map to see hourly data for that monitor</p>
                  </div>
                  <div className="flex-1 overflow-hidden min-h-0 px-2 pb-2">
                    <iframe
                      src="https://tableau.alleghenycounty.us/t/PublicSite/views/AlleghenyCountyAirQuality/Today?:embed=y&:showVizHome=no&:hideTabs=true&:toolbar=bottom&:device=phone"
                      className="w-full h-full border-0"
                      title="Allegheny County Air Quality Dashboard"
                      allowFullScreen
                      style={{ display: 'block' }}
                    />
                  </div>
                </>
              )}

              {activeTab === 'overtime' && (
                <>
                  <div className="px-2 pt-2 pb-1 flex-shrink-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-800">{currentPollutant.name} Trends Over Time</h3>
                    <p className="text-xs text-gray-600">View historical data and trends for {currentPollutant.name}</p>
                  </div>
                  <div className="flex-1 overflow-hidden min-h-0 px-2 pb-2">
                    <iframe
                      src="https://tableau.alleghenycounty.us/t/PublicSite/views/AlleghenyCountyAirQuality/OverTime?:embed=y&:showVizHome=no&:hideTabs=true&:toolbar=bottom&:device=phone"
                      className="w-full h-full border-0"
                      title="Allegheny County Air Quality Trends"
                      allowFullScreen
                      style={{ display: 'block' }}
                    />
                  </div>
                </>
              )}

              {activeTab === 'faq' && (
                <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">Frequently Asked Questions</h3>
                      <div className="space-y-2 text-xs text-gray-700">
                        <div>
                          <p className="font-semibold mb-1">What is the Air Quality Index (AQI)?</p>
                          <p>The AQI is a scale used to report daily air quality. It tells you how clean or polluted your air is, and what associated health effects might be a concern for you.</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">How is AQI calculated?</p>
                          <p>AQI is calculated based on the highest value of five major air pollutants regulated by the Clean Air Act: ground-level ozone, particle pollution (PM2.5 and PM10), carbon monoxide, sulfur dioxide, and nitrogen dioxide.</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">What should I do when air quality is unhealthy?</p>
                          <p>When air quality is unhealthy, sensitive groups should reduce prolonged or heavy exertion outdoors. Everyone should consider reducing outdoor activities, especially during peak pollution hours.</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Where does this data come from?</p>
                          <p>This data comes from official monitoring stations operated by the Allegheny County Health Department (ACHD) and is updated regularly throughout the day.</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">How often is the data updated?</p>
                          <p>Air quality data is typically updated hourly. The timestamp shown indicates when the most recent reading was taken.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - AQI Data & Scale */}
          <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4">
            {/* Current AQI */}
            <div className={`bg-white rounded-lg shadow-md p-3 sm:p-4 flex-shrink-0 ${aqiInfo.color} bg-opacity-20 border-2 ${aqiInfo.color} border-opacity-50`}>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1">
                Highest Most Recent
                <span className="text-xs text-gray-400">?</span>
              </h3>
              <p className="text-xs text-gray-600 mb-2">{currentPollutant.name} AQI</p>
              <div className={`text-3xl sm:text-4xl font-bold ${aqiInfo.textColor} mb-1`}>
                {currentAQI}
              </div>
              <p className="text-xs text-gray-600">{dayjs().format('MM/DD/YYYY hh:mm A')} EST</p>
              <p className="text-xs text-gray-600 mt-1">Occurred at: Avalon</p>
            </div>

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

            {/* Stats Cards - Desktop only */}
            {stats && (
              <div className="hidden lg:grid grid-cols-1 gap-2">
                <div className="bg-white rounded-lg shadow-md p-3 text-center">
                  <div className="text-2xl font-bold text-slate-700">{stats.sensorCount}</div>
                  <div className="text-xs text-gray-600">Active Sensors</div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3 text-center">
                  <div className="text-2xl font-bold text-slate-700">{stats.reportCount}</div>
                  <div className="text-xs text-gray-600">Health Reports</div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3 text-center">
                  <div className="text-2xl font-bold text-slate-700">{stats.avgPM25.toFixed(1)}</div>
                  <div className="text-xs text-gray-600">Avg PM2.5 (μg/m³)</div>
              </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
