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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-600">Loading admin dashboard...</div>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-red-600">Error: {error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl sm:text-3xl lg:text-4xl text-center text-slate-800 mb-6 sm:mb-8 lg:mb-12 font-bold tracking-tight">
        Admin Dashboard
      </h2>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 sm:p-8 rounded-2xl text-white shadow-xl">
          <h3 className="mb-4 text-lg sm:text-xl font-semibold">System Health</h3>
          <div className="space-y-2 text-sm sm:text-base">
            <div><strong>Status:</strong> {stats?.systemHealth?.status}</div>
            <div><strong>Uptime:</strong> {Math.floor((stats?.systemHealth?.uptime || 0) / 1000 / 60)} minutes</div>
            <div><strong>Ollama:</strong> {stats?.systemHealth?.services?.ollama}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-red-500 p-6 sm:p-8 rounded-2xl text-white shadow-xl">
          <h3 className="mb-4 text-lg sm:text-xl font-semibold">User Activity</h3>
          <div className="space-y-2 text-sm sm:text-base">
            <div><strong>Total Requests:</strong> {stats?.userActivity?.requests}</div>
            <div><strong>Error Rate:</strong> {stats?.userActivity?.errorRate}%</div>
            <div><strong>Avg Response:</strong> {stats?.userActivity?.avgResponseTime}ms</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-6 sm:p-8 rounded-2xl text-white shadow-xl">
          <h3 className="mb-4 text-lg sm:text-xl font-semibold">Data Overview</h3>
          <div className="space-y-2 text-sm sm:text-base">
            <div><strong>Total Reports:</strong> {stats?.totalReports}</div>
            <div><strong>Active Sensors:</strong> {stats?.totalSensors}</div>
            <div><strong>AI Success Rate:</strong> {stats?.userActivity?.ollamaSuccessRate}%</div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8">
        <h3 className="mb-4 sm:mb-6 text-xl sm:text-2xl text-slate-800 font-semibold">Recent Symptom Reports</h3>
        
        {stats?.recentReports && stats.recentReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="p-3 sm:p-4 text-left text-slate-700 text-sm sm:text-base font-semibold">User ID</th>
                  <th className="p-3 sm:p-4 text-left text-slate-700 text-sm sm:text-base font-semibold">Name</th>
                  <th className="p-3 sm:p-4 text-left text-slate-700 text-sm sm:text-base font-semibold hidden sm:table-cell">Symptoms</th>
                  <th className="p-3 sm:p-4 text-left text-slate-700 text-sm sm:text-base font-semibold">Severity</th>
                  <th className="p-3 sm:p-4 text-left text-slate-700 text-sm sm:text-base font-semibold hidden md:table-cell">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentReports.map((report: any) => (
                  <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 sm:p-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm">
                        {report.userId?.substring(0, 8)}...
                      </code>
                    </td>
                    <td className="p-3 sm:p-4 text-sm sm:text-base">{report.fullName || 'Anonymous'}</td>
                    <td className="p-3 sm:p-4 text-sm sm:text-base hidden sm:table-cell">
                      {report.symptoms?.slice(0, 2).join(', ')}
                      {report.symptoms?.length > 2 && '...'}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className={`px-2 py-1 rounded text-xs sm:text-sm font-semibold ${
                        report.severity >= 4 ? 'bg-red-100 text-red-700' : 
                        report.severity >= 3 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {report.severity}/5
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-gray-600 text-sm hidden md:table-cell">
                      {new Date(report.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-600 py-12">
            No recent reports found.
          </div>
        )}
      </div>

      {/* System Metrics */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10">
        <h3 className="mb-4 sm:mb-6 text-xl sm:text-2xl text-slate-800 font-semibold">System Metrics</h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-600 mb-2">
              {stats?.userActivity?.requests || 0}
            </div>
            <div className="text-sm sm:text-base text-gray-600">Total Requests</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-600 mb-2">
              {stats?.userActivity?.ollamaRequests || 0}
            </div>
            <div className="text-sm sm:text-base text-gray-600">AI Requests</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-2">
              {stats?.userActivity?.ollamaSuccessRate || 0}%
            </div>
            <div className="text-sm sm:text-base text-gray-600">AI Success Rate</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-600 mb-2">
              {stats?.userActivity?.avgResponseTime || 0}ms
            </div>
            <div className="text-sm sm:text-base text-gray-600">Avg Response Time</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 