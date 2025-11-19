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

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl text-center text-slate-800 mb-8 sm:mb-12 font-bold tracking-tight">
        Community Health Dashboard
      </h1>

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 lg:space-y-12">
        
        {/* ACHD Official Air Quality Dashboard */}
        <FadeInSection delay={0}>
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl mb-3 sm:mb-4 text-slate-800 font-semibold">
            Official ACHD Air Quality Dashboard
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Live data from Allegheny County Health Department's official monitoring stations
          </p>
          
          {/* Tableau embedded dashboard */}
          <div 
            className="w-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] overflow-auto"
            dangerouslySetInnerHTML={{
              __html: `<tableau-viz id='tableau-viz' src='https://tableau.alleghenycounty.us/t/PublicSite/views/AlleghenyCountyAirQuality/Today' width='100%' height='777' hide-tabs toolbar='bottom' ></tableau-viz>`
            }}
          />
        </div>
        </FadeInSection>

        {/* PM2.5 History Chart */}
        {pm25History.length > 0 && (
          <FadeInSection delay={0.2}>
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
            <h3 className="text-lg sm:text-xl lg:text-2xl mb-4 sm:mb-6 text-slate-800 font-semibold">
              PM2.5 Trend (Last 7 Days)
            </h3>
            <div className="h-64 sm:h-80 lg:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={pm25History.map((d) => ({
                    date: dayjs.unix(d.dt).format('MMM D'),
                    pm25: Math.round(d.pm2_5 * 10) / 10
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    label={{ value: 'PM2.5 (μg/m³)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pm25" 
                    stroke="#0891b2" 
                    strokeWidth={2}
                    fill="#0891b2"
                    fillOpacity={0.1}
                    name="PM2.5 (μg/m³)"
                    dot={{ fill: '#0891b2', r: 4 }}
                    activeDot={{ r: 6 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          </FadeInSection>
        )}
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FadeInSection delay={0.4}>
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-600 mb-2">
                {stats.sensorCount}
              </div>
              <div className="text-base sm:text-lg text-gray-600">
                Active Sensors
              </div>
            </div>
            </FadeInSection>

            <FadeInSection delay={0.6}>
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-success-600 mb-2">
                {stats.reportCount}
              </div>
              <div className="text-base sm:text-lg text-gray-600">
                Health Reports
              </div>
            </div>
            </FadeInSection>

            <FadeInSection delay={0.8}>
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-warning-600 mb-2">
                {stats.avgPM25.toFixed(1)}
              </div>
              <div className="text-base sm:text-lg text-gray-600">
                Avg PM2.5 (μg/m³)
              </div>
            </div>
            </FadeInSection>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
