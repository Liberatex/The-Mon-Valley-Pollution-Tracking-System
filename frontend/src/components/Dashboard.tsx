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
    <div className="dashboard">
      <h2>Community Health Dashboard</h2>
      <div className="dashboard-cards" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="card" style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, minWidth: 180 }}>
          <div><strong>Current AQI:</strong></div>
          <div style={{ fontSize: 24 }}>{aqi !== null ? aqi : 'N/A'}</div>
        </div>
        <div className="card" style={{ background: '#fce4ec', padding: 16, borderRadius: 8, minWidth: 180 }}>
          <div><strong>PM2.5 (μg/m³):</strong></div>
          <div style={{ fontSize: 24 }}>{pm25 !== null ? pm25.toFixed(1) : 'N/A'}</div>
        </div>
        <div className="card" style={{ background: '#e8f5e9', padding: 16, borderRadius: 8, minWidth: 180 }}>
          <div><strong>Active Sensors:</strong></div>
          <div style={{ fontSize: 24 }}>{stats?.sensorCount ?? 'N/A'}</div>
        </div>
        <div className="card" style={{ background: '#fff3e0', padding: 16, borderRadius: 8, minWidth: 180 }}>
          <div><strong>Symptom Reports:</strong></div>
          <div style={{ fontSize: 24 }}>{stats?.reportCount ?? 'N/A'}</div>
        </div>
      </div>
      {pm25History.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3>PM2.5 Forecast (Next 5 Days)</h3>
          <Line
            data={{
              labels: pm25History.map((d) => dayjs.unix(d.dt).format('MMM D, HH:mm')),
              datasets: [
                {
                  label: 'PM2.5 (μg/m³)',
                  data: pm25History.map((d) => d.pm2_5),
                  fill: false,
                  borderColor: '#1976d2',
                  backgroundColor: '#1976d2',
                  tension: 0.3,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: true, position: 'top' },
                title: { display: false },
              },
              scales: {
                x: { display: true, title: { display: true, text: 'Time' } },
                y: { display: true, title: { display: true, text: 'PM2.5 (μg/m³)' } },
              },
            }}
          />
        </div>
      )}
      <div className="dashboard-stats" style={{ marginTop: 24 }}>
        <div><strong>Average PM2.5 (Sensors):</strong> {stats?.avgPM25.toFixed(1)} μg/m³</div>
        {stats?.lastReportAt && (
          <div><strong>Last Symptom Report:</strong> {dayjs(stats.lastReportAt).format('MMM D, YYYY HH:mm')}</div>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <strong>Health Advisory:</strong>
        <div>
          {aqi !== null && aqi >= 4 ? (
            <span style={{ color: 'red' }}>Unhealthy air quality. Limit outdoor activity and monitor symptoms.</span>
          ) : aqi !== null && aqi === 3 ? (
            <span style={{ color: 'orange' }}>Moderate air quality. Sensitive groups should take precautions.</span>
          ) : aqi !== null ? (
            <span style={{ color: 'green' }}>Good air quality.</span>
          ) : (
            <span>N/A</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 