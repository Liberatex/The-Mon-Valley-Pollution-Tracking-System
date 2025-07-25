import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import axios from 'axios';
import dayjs from 'dayjs';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface DashboardStats {
  avgPM25: number;
  sensorCount: number;
  reportCount: number;
  lastReportAt?: string;
}

interface AQIDataPoint {
  dt: number;
  pm2_5: number;
}

const CLAIRTON_COORDS = { lat: 40.292, lon: -79.881 };
const OWM_API_KEY = process.env.REACT_APP_OWM_API_KEY || '';

const Dashboard: React.FC = () => {
  console.log('OWM API KEY:', process.env.REACT_APP_OWM_API_KEY);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aqi, setAqi] = useState<number | null>(null);
  const [pm25, setPm25] = useState<number | null>(null);
  const [pm25History, setPm25History] = useState<AQIDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        // Fetch sensors
        const sensorSnap = await getDocs(collection(db, 'processedSensorReadings'));
        const sensors = sensorSnap.docs.map(doc => doc.data());
        const sensorCount = sensors.length;
        const avgPM25 = sensorCount > 0 ? (
          sensors.reduce((sum, s) => sum + (s.correctedPM25 || 0), 0) / sensorCount
        ) : 0;
        // Fetch reports
        const reportSnap = await getDocs(collection(db, 'symptomReports'));
        const reportCount = reportSnap.size;
        // Get last report time
        let lastReportAt: string | undefined = undefined;
        if (reportCount > 0) {
          const lastReportQuery = query(collection(db, 'symptomReports'), orderBy('submittedAt', 'desc'), limit(1));
          const lastReportSnap = await getDocs(lastReportQuery);
          if (!lastReportSnap.empty) {
            const last = lastReportSnap.docs[0].data();
            lastReportAt = last.submittedAt?.toDate?.().toISOString?.() || last.submittedAt || undefined;
          }
        }
        setStats({ avgPM25, sensorCount, reportCount, lastReportAt });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchAQI() {
      setLoading(true);
      setError(null);
      try {
        // OpenWeatherMap Air Pollution API (current and forecast)
        // NOTE: You can get a free API key at https://openweathermap.org/api/air-pollution
        const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${CLAIRTON_COORDS.lat}&lon=${CLAIRTON_COORDS.lon}&appid=${OWM_API_KEY}`;
        const resp = await axios.get(url);
        const data = resp.data;
        setAqi(data.list[0]?.main.aqi || null);
        setPm25(data.list[0]?.components.pm2_5 || null);
      } catch (err: any) {
        setError('Failed to fetch AQI data.');
      } finally {
        setLoading(false);
      }
    }
    async function fetchPM25History() {
      try {
        // OpenWeatherMap Air Pollution Forecast API (hourly for 5 days)
        const url = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${CLAIRTON_COORDS.lat}&lon=${CLAIRTON_COORDS.lon}&appid=${OWM_API_KEY}`;
        const resp = await axios.get(url);
        const data = resp.data;
        const history: AQIDataPoint[] = (data.list || []).map((item: any) => ({
          dt: item.dt,
          pm2_5: item.components.pm2_5,
        }));
        setPm25History(history);
      } catch (err: any) {
        // Don't block dashboard if history fails
      }
    }
    fetchAQI();
    fetchPM25History();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#1976d2', 
        marginBottom: '30px',
        fontSize: window.innerWidth <= 768 ? '1.8rem' : '2.5rem',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        Community Health Dashboard
      </h2>
      
      {/* PM2.5 Graph - Now at the top and bigger */}
      {pm25History.length > 0 && (
        <div style={{ 
          marginBottom: '40px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: window.innerWidth <= 768 ? '20px' : '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          color: 'white'
        }}>
          <h3 style={{ 
            marginBottom: '20px', 
            fontSize: window.innerWidth <= 768 ? '1.3rem' : '1.8rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            PM2.5 Forecast (Next 5 Days)
          </h3>
          <div style={{ 
            height: window.innerWidth <= 768 ? '300px' : '400px', 
            position: 'relative',
            width: '100%'
          }}>
            <Line
              data={{
                labels: pm25History.map((d) => dayjs.unix(d.dt).format('MMM D, HH:mm')),
                datasets: [
                  {
                    label: 'PM2.5 (μg/m³)',
                    data: pm25History.map((d) => d.pm2_5),
                    fill: true,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(255, 255, 255, 0.9)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: window.innerWidth <= 768 ? 4 : 6,
                    pointHoverRadius: window.innerWidth <= 768 ? 6 : 8,
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    display: true, 
                    position: 'top',
                    labels: {
                      color: 'white',
                      font: { 
                        size: window.innerWidth <= 768 ? 12 : 14, 
                        weight: 'bold' 
                      }
                    }
                  },
                  title: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                      title: function(context) {
                        return context[0].label;
                      },
                      label: function(context) {
                        return `PM2.5: ${context.parsed.y.toFixed(2)} μg/m³`;
                      }
                    }
                  }
                },
                scales: {
                  x: { 
                    display: true, 
                    title: { 
                      display: true, 
                      text: 'Time',
                      color: 'white',
                      font: { 
                        size: window.innerWidth <= 768 ? 12 : 14, 
                        weight: 'bold' 
                      }
                    },
                    grid: {
                      color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                      color: 'white',
                      maxRotation: window.innerWidth <= 768 ? 45 : 0,
                      minRotation: window.innerWidth <= 768 ? 45 : 0,
                      font: {
                        size: window.innerWidth <= 768 ? 10 : 12
                      }
                    }
                  },
                  y: { 
                    display: true, 
                    title: { 
                      display: true, 
                      text: 'PM2.5 (μg/m³)',
                      color: 'white',
                      font: { 
                        size: window.innerWidth <= 768 ? 12 : 14, 
                        weight: 'bold' 
                      }
                    },
                    grid: {
                      color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                      color: 'white',
                      font: {
                        size: window.innerWidth <= 768 ? 10 : 12
                      }
                    }
                  },
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                },
                animation: {
                  duration: 2000,
                  easing: 'easeInOutQuart'
                },
                elements: {
                  point: {
                    hoverRadius: window.innerWidth <= 768 ? 8 : 10
                  }
                }
              }}
            />
          </div>
        </div>
      )}
      
      {/* Stats Cards - Now below the graph with improved design */}
      <div className="dashboard-cards" style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: window.innerWidth <= 768 ? '15px' : '20px', 
        marginBottom: '30px' 
      }}>
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: window.innerWidth <= 768 ? '20px' : '25px',
          borderRadius: '15px',
          minHeight: window.innerWidth <= 768 ? '100px' : '120px',
          boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
        }} onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
        }}>
          <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem', marginBottom: '8px', opacity: 0.9 }}>Current AQI</div>
          <div style={{ fontSize: window.innerWidth <= 768 ? '2rem' : '2.5rem', fontWeight: 'bold' }}>{aqi !== null ? aqi : 'N/A'}</div>
        </div>
        
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          padding: window.innerWidth <= 768 ? '20px' : '25px',
          borderRadius: '15px',
          minHeight: window.innerWidth <= 768 ? '100px' : '120px',
          boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(240, 147, 251, 0.4)';
        }} onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(240, 147, 251, 0.3)';
        }}>
          <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem', marginBottom: '8px', opacity: 0.9 }}>PM2.5 (μg/m³)</div>
          <div style={{ fontSize: window.innerWidth <= 768 ? '2rem' : '2.5rem', fontWeight: 'bold' }}>{pm25 !== null ? pm25.toFixed(1) : 'N/A'}</div>
        </div>
        
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          padding: window.innerWidth <= 768 ? '20px' : '25px',
          borderRadius: '15px',
          minHeight: window.innerWidth <= 768 ? '100px' : '120px',
          boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(79, 172, 254, 0.4)';
        }} onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(79, 172, 254, 0.3)';
        }}>
          <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem', marginBottom: '8px', opacity: 0.9 }}>Active Sensors</div>
          <div style={{ fontSize: window.innerWidth <= 768 ? '2rem' : '2.5rem', fontWeight: 'bold' }}>{stats?.sensorCount ?? 'N/A'}</div>
        </div>
        
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          padding: window.innerWidth <= 768 ? '20px' : '25px',
          borderRadius: '15px',
          minHeight: window.innerWidth <= 768 ? '100px' : '120px',
          boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(67, 233, 123, 0.4)';
        }} onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(67, 233, 123, 0.3)';
        }}>
          <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem', marginBottom: '8px', opacity: 0.9 }}>Symptom Reports</div>
          <div style={{ fontSize: window.innerWidth <= 768 ? '2rem' : '2.5rem', fontWeight: 'bold' }}>{stats?.reportCount ?? 'N/A'}</div>
        </div>
      </div>
      {/* Additional Stats and Health Advisory */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        <div style={{ 
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0'
        }}>
          <h4 style={{ 
            marginBottom: '15px', 
            color: '#1976d2',
            fontSize: '1.3rem',
            fontWeight: '600'
          }}>📊 Additional Statistics</h4>
          <div style={{ lineHeight: '1.8' }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>Average PM2.5 (Sensors):</strong> 
              <span style={{ 
                color: '#1976d2', 
                fontWeight: 'bold',
                fontSize: '1.1rem',
                marginLeft: '10px'
              }}>
                {stats?.avgPM25.toFixed(1)} μg/m³
              </span>
            </div>
            {stats?.lastReportAt && (
              <div>
                <strong>Last Symptom Report:</strong> 
                <span style={{ 
                  color: '#666',
                  marginLeft: '10px'
                }}>
                  {dayjs(stats.lastReportAt).format('MMM D, YYYY HH:mm')}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ 
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0'
        }}>
          <h4 style={{ 
            marginBottom: '15px', 
            color: '#1976d2',
            fontSize: '1.3rem',
            fontWeight: '600'
          }}>⚠️ Health Advisory</h4>
          <div style={{ 
            padding: '15px',
            borderRadius: '10px',
            background: aqi !== null && aqi >= 4 ? '#ffebee' : 
                       aqi !== null && aqi === 3 ? '#fff3e0' : '#e8f5e9',
            border: aqi !== null && aqi >= 4 ? '2px solid #f44336' :
                   aqi !== null && aqi === 3 ? '2px solid #ff9800' : '2px solid #4caf50'
          }}>
            {aqi !== null && aqi >= 4 ? (
              <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                🚨 Unhealthy air quality. Limit outdoor activity and monitor symptoms.
              </div>
            ) : aqi !== null && aqi === 3 ? (
              <div style={{ color: '#f57c00', fontWeight: 'bold' }}>
                ⚠️ Moderate air quality. Sensitive groups should take precautions.
              </div>
            ) : aqi !== null ? (
              <div style={{ color: '#388e3c', fontWeight: 'bold' }}>
                ✅ Good air quality.
              </div>
            ) : (
              <div style={{ color: '#666' }}>
                📊 Air quality data unavailable.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 