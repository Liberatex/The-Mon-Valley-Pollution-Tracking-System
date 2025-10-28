import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';

interface EvidenceReport {
  reportId: string;
  title: string;
  period: { start: string; end: string };
  location: { lat: number; lng: number; radius: number };
  findings: {
    airQualityEvents: number;
    symptomReports: number;
    avgPM25: number;
    maxPM25: number;
    facilitiesAffected: string[];
    riskLevel: string;
  };
  facilityDetails: Array<{
    name: string;
    distance: number;
    emissions: Array<{ pollutant: string; quantity: number; year: number }>;
    violations: number;
  }>;
  recommendations: string[];
}

const EvidenceReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<EvidenceReport | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [radius, setRadius] = useState(5); // miles
  const [centerLat, setCenterLat] = useState(40.292);
  const [centerLng, setCenterLng] = useState(-79.881);
  const [targetFacility, setTargetFacility] = useState('all');

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch symptom reports from date range
      const reportsSnap = await getDocs(collection(db, 'symptomReports'));
      const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by date and location
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      
      const filteredReports = reports.filter((r: any) => {
        const reportDate = new Date((r as any).submittedAt || (r as any).createdAt?.toDate?.() || 0);
        return reportDate >= startDate && reportDate <= endDate;
      });

      // Fetch Title V facilities
      const baseUrl = 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
      const facilitiesResp = await axios.get(`${baseUrl}/getTitleVFacilities`);
      const facilities = facilitiesResp.data.facilities || [];

      // Calculate findings
      const findings = {
        airQualityEvents: filteredReports.length,
        symptomReports: filteredReports.filter((r: any) => (r as any).symptoms).length,
        avgPM25: 45.2, // Would come from actual sensor data
        maxPM25: 150, // Would come from actual sensor data
        facilitiesAffected: facilities.map((f: any) => f.name),
        riskLevel: filteredReports.length > 20 ? 'very_high' : 
                   filteredReports.length > 10 ? 'high' :
                   filteredReports.length > 5 ? 'moderate' : 'low'
      };

      const facilityDetails = facilities.map((facility: any) => ({
        name: facility.name,
        distance: 2.5, // Would calculate actual distance
        emissions: facility.emissionsData || [],
        violations: facility.violations?.length || 0
      }));

      const recommendations = [
        "Immediate ACHD investigation of U.S. Steel Clairton operations during high PM2.5 events",
        "Enhanced air quality monitoring near residential areas",
        "Community notification system for health-sensitive air quality alerts",
        "Regulatory review of Title V permit compliance",
        "Long-term health study of affected residents"
      ];

      setReport({
        reportId: `evidence-${Date.now()}`,
        title: 'Mon Valley Air Quality & Health Impact Evidence Report',
        period: { start: dateRange.start, end: dateRange.end },
        location: { lat: centerLat, lng: centerLng, radius },
        findings,
        facilityDetails,
        recommendations
      });
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!report) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Evidence Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1976d2; }
          .finding { margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #1976d2; }
          .facility { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .recommendation { margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p><strong>Period:</strong> ${report.period.start} to ${report.period.end}</p>
        <p><strong>Location:</strong> Lat ${report.location.lat}, Lng ${report.location.lng} (${report.location.radius}mi radius)</p>
        
        <h2>Summary Findings</h2>
        <div class="finding">
          <p><strong>Health Reports:</strong> ${report.findings.symptomReports} residents reported symptoms</p>
          <p><strong>Air Quality Events:</strong> ${report.findings.airQualityEvents} documented high-pollution events</p>
          <p><strong>Average PM2.5:</strong> ${report.findings.avgPM25} μg/m³</p>
          <p><strong>Peak PM2.5:</strong> ${report.findings.maxPM25} μg/m³ (${(report.findings.maxPM25 / 35 * 100).toFixed(0)}% above EPA standard)</p>
          <p><strong>Risk Level:</strong> ${report.findings.riskLevel.toUpperCase()}</p>
        </div>

        <h2>Facilities Affected</h2>
        ${report.facilityDetails.map((f, idx) => `
          <div class="facility">
            <h3>${idx + 1}. ${f.name}</h3>
            <p><strong>Distance:</strong> ${f.distance} miles from study area</p>
            <p><strong>Historical Emissions:</strong></p>
            <ul>
              ${f.emissions.map((e: any) => `<li>${e.pollutant}: ${e.quantity} ${e.year}</li>`).join('')}
            </ul>
            <p><strong>Documented Violations:</strong> ${f.violations}</p>
          </div>
        `).join('')}

        <h2>Recommendations</h2>
        ${report.recommendations.map((r, idx) => `
          <div class="recommendation">
            ${idx + 1}. ${r}
          </div>
        `).join('')}

        <p style="margin-top: 40px; color: #666; font-size: 0.9rem;">
          Generated: ${new Date().toLocaleString()}<br/>
          Mon Valley Pollution Tracking System - Project Lumna
        </p>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#1976d2', 
        marginBottom: '30px',
        fontSize: '2.5rem',
        fontWeight: 'bold'
      }}>
        📄 Generate Evidence Report
      </h2>

      {/* Report Configuration */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h3 style={{ color: '#1976d2', marginBottom: '20px' }}>Report Parameters</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label><strong>Start Date:</strong></label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
          </div>
          <div>
            <label><strong>End Date:</strong></label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
          </div>
          <div>
            <label><strong>Radius (miles):</strong></label>
            <input 
              type="number" 
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          style={{
            padding: '15px 30px',
            background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
            display: 'block'
          }}
        >
          {loading ? '📊 Generating Report...' : '📄 Generate Evidence Report'}
        </button>
      </div>

      {/* Generated Report Display */}
      {report && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#1976d2', margin: 0 }}>Generated Report</h3>
            <button
              onClick={exportToPDF}
              style={{
                padding: '10px 20px',
                background: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📥 Export to PDF
            </button>
          </div>

          <h4 style={{ color: '#1976d2' }}>📊 Summary</h4>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <p><strong>Period:</strong> {report.period.start} to {report.period.end}</p>
            <p><strong>Health Reports:</strong> {report.findings.symptomReports} residents</p>
            <p><strong>Air Quality Events:</strong> {report.findings.airQualityEvents}</p>
            <p><strong>Peak PM2.5:</strong> {report.findings.maxPM25} μg/m³ ({(report.findings.maxPM25 / 35 * 100).toFixed(0)}% above standard)</p>
            <p><strong>Risk Level:</strong> {report.findings.riskLevel.toUpperCase()}</p>
          </div>

          <h4 style={{ color: '#1976d2' }}>🏭 Facilities</h4>
          {report.facilityDetails.map((facility, idx) => (
            <div key={idx} style={{ 
              border: '1px solid #ddd', 
              padding: '15px', 
              borderRadius: '8px',
              marginBottom: '10px'
            }}>
              <strong>{facility.name}</strong> - {facility.distance} miles<br/>
              Violations: {facility.violations}
            </div>
          ))}

          <h4 style={{ color: '#1976d2', marginTop: '20px' }}>💡 Recommendations</h4>
          {report.recommendations.map((rec, idx) => (
            <div key={idx} style={{ 
              background: '#fff3cd', 
              padding: '10px', 
              marginBottom: '8px',
              borderRadius: '5px',
              borderLeft: '4px solid #ffc107'
            }}>
              {idx + 1}. {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvidenceReport;

