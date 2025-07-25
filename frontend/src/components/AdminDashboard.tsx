import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import axios from 'axios';

interface AdminStats {
  totalReports: number;
  totalSensors: number;
  recentReports: any[];
  systemHealth: any;
  userActivity: any;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch symptom reports
      const reportsQuery = query(collection(db, 'symptomReports'), orderBy('submittedAt', 'desc'), limit(10));
      const reportsSnap = await getDocs(reportsQuery);
      const recentReports = reportsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch sensor data
      const sensorsSnap = await getDocs(collection(db, 'processedSensorReadings'));
      const totalSensors = sensorsSnap.size;

      // Fetch system health
      const healthResponse = await axios.get('http://localhost:5001/api/health');
      const metricsResponse = await axios.get('http://localhost:5001/api/metrics');

      setStats({
        totalReports: recentReports.length,
        totalSensors,
        recentReports,
        systemHealth: healthResponse.data,
        userActivity: metricsResponse.data
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading admin dashboard...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#1976d2', 
        marginBottom: '30px',
        fontSize: '2.5rem',
        fontWeight: 'bold'
      }}>
        🔧 Admin Dashboard
      </h2>

      {/* System Health Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '25px',
          borderRadius: '15px',
          color: 'white',
          boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
        }}>
          <h3 style={{ marginBottom: '15px', fontSize: '1.3rem' }}>📊 System Health</h3>
          <div style={{ lineHeight: '1.8' }}>
            <div><strong>Status:</strong> {stats?.systemHealth?.status}</div>
            <div><strong>Uptime:</strong> {Math.floor((stats?.systemHealth?.uptime || 0) / 1000 / 60)} minutes</div>
            <div><strong>Ollama:</strong> {stats?.systemHealth?.services?.ollama}</div>
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          padding: '25px',
          borderRadius: '15px',
          color: 'white',
          boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)'
        }}>
          <h3 style={{ marginBottom: '15px', fontSize: '1.3rem' }}>👥 User Activity</h3>
          <div style={{ lineHeight: '1.8' }}>
            <div><strong>Total Requests:</strong> {stats?.userActivity?.requests}</div>
            <div><strong>Error Rate:</strong> {stats?.userActivity?.errorRate}%</div>
            <div><strong>Avg Response:</strong> {stats?.userActivity?.avgResponseTime}ms</div>
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          padding: '25px',
          borderRadius: '15px',
          color: 'white',
          boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)'
        }}>
          <h3 style={{ marginBottom: '15px', fontSize: '1.3rem' }}>📈 Data Overview</h3>
          <div style={{ lineHeight: '1.8' }}>
            <div><strong>Total Reports:</strong> {stats?.totalReports}</div>
            <div><strong>Active Sensors:</strong> {stats?.totalSensors}</div>
            <div><strong>AI Success Rate:</strong> {stats?.userActivity?.ollamaSuccessRate}%</div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div style={{ 
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h3 style={{ 
          marginBottom: '20px', 
          color: '#1976d2',
          fontSize: '1.5rem'
        }}>📝 Recent Symptom Reports</h3>
        
        {stats?.recentReports && stats.recentReports.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#1976d2' }}>User ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#1976d2' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#1976d2' }}>Symptoms</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#1976d2' }}>Severity</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#1976d2' }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentReports.map((report: any) => (
                  <tr key={report.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>
                      <code style={{ 
                        background: '#f5f5f5', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}>
                        {report.userId?.substring(0, 8)}...
                      </code>
                    </td>
                    <td style={{ padding: '12px' }}>{report.fullName || 'Anonymous'}</td>
                    <td style={{ padding: '12px' }}>
                      {report.symptoms?.slice(0, 2).join(', ')}
                      {report.symptoms?.length > 2 && '...'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: report.severity >= 4 ? '#ffebee' : 
                                   report.severity >= 3 ? '#fff3e0' : '#e8f5e9',
                        color: report.severity >= 4 ? '#d32f2f' : 
                               report.severity >= 3 ? '#f57c00' : '#388e3c',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}>
                        {report.severity}/5
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>
                      {new Date(report.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            No recent reports found.
          </div>
        )}
      </div>

      {/* System Metrics */}
      <div style={{ 
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 
          marginBottom: '20px', 
          color: '#1976d2',
          fontSize: '1.5rem'
        }}>⚙️ System Metrics</h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>
              {stats?.userActivity?.requests || 0}
            </div>
            <div style={{ color: '#666' }}>Total Requests</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>
              {stats?.userActivity?.ollamaRequests || 0}
            </div>
            <div style={{ color: '#666' }}>AI Requests</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388e3c' }}>
              {stats?.userActivity?.ollamaSuccessRate || 0}%
            </div>
            <div style={{ color: '#666' }}>AI Success Rate</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d32f2f' }}>
              {stats?.userActivity?.avgResponseTime || 0}ms
            </div>
            <div style={{ color: '#666' }}>Avg Response Time</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 