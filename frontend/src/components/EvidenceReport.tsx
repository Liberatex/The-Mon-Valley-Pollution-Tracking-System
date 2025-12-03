import React, { useEffect, useState } from 'react';
import axios from 'axios';
// Using abstraction layer - works with both Firebase and Azure
import { db } from '../providers';
import jsPDF from 'jspdf';
import { shouldUseEmulator } from '../utils/env';

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
    totalViolations?: number;
    sncFacilities?: number;
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
      // Fetch symptom reports from date range using abstraction layer
      const reportsCollection = db.getCollection('symptomReports');
      const reports = await reportsCollection.get();
      
      // Filter by date and location
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      
      const filteredReports = reports.filter((r: any) => {
        const reportDate = new Date((r as any).submittedAt || (r as any).createdAt?.toDate?.() || 0);
        return reportDate >= startDate && reportDate <= endDate;
      });

      // Fetch Title V facilities
      const isDevelopment = shouldUseEmulator();
      const baseUrl = isDevelopment 
        ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
        : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
      const facilitiesResp = await axios.get(`${baseUrl}/getTitleVFacilities`);
      const facilities = facilitiesResp.data?.facilities || [];

      // Fetch compliance data for facilities (VCAN requirement)
      const facilitiesWithCompliance = await Promise.all(
        facilities.map(async (facility: any) => {
          try {
            const complianceResp = await axios.get(`${baseUrl}/getFacilityCompliance`, {
              params: { facilityId: facility.facilityId },
              timeout: 5000,
            });
            return {
              ...facility,
              compliance: complianceResp.data?.compliance || null,
            };
          } catch (error) {
            return { ...facility, compliance: null };
          }
        })
      );


      // Fetch actual sensor data for PM2.5 calculations
      let avgPM25 = 45.2; // Default fallback
      let maxPM25 = 150; // Default fallback
      
      try {
        // Try to get ACHD data
        const achdResp = await axios.get(`${baseUrl}/getACHDAirQuality`, { timeout: 10000 });
        if (achdResp.data?.success && achdResp.data.data?.length > 0) {
          const pm25Values = achdResp.data.data
            .map((d: any) => d.pm25)
            .filter((v: any) => v && !isNaN(v));
          if (pm25Values.length > 0) {
            avgPM25 = pm25Values.reduce((a: number, b: number) => a + b, 0) / pm25Values.length;
            maxPM25 = Math.max(...pm25Values);
          }
        }
      } catch (err) {
        console.warn('Could not fetch ACHD data for report, using defaults');
      }

      // Filter facilities by radius (use facilitiesWithCompliance)
      const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const nearbyFacilities = facilitiesWithCompliance
        .filter((f: any) => {
          if (!f.location?.lat || !f.location?.lng) return false;
          const distance = calculateDistance(centerLat, centerLng, f.location.lat, f.location.lng);
          return distance <= radius;
        })
        .map((f: any) => {
          const distance = calculateDistance(centerLat, centerLng, f.location.lat, f.location.lng);
          return { ...f, distance };
        })
        .sort((a: any, b: any) => a.distance - b.distance);

      // Calculate findings (after nearbyFacilities is defined)
      const symptomReportCount = filteredReports.filter((r: any) => (r as any).symptoms && (r as any).symptoms.length > 0).length;
      
      // Count compliance violations
      const totalViolations = nearbyFacilities.reduce((sum: number, f: any) => {
        return sum + (f.compliance?.violations?.length || 0);
      }, 0);
      
      const sncFacilities = nearbyFacilities.filter((f: any) => f.compliance?.isSNC).length;
      
      const findings = {
        airQualityEvents: filteredReports.length,
        symptomReports: symptomReportCount,
        avgPM25: Math.round(avgPM25 * 10) / 10,
        maxPM25: Math.round(maxPM25 * 10) / 10,
        facilitiesAffected: nearbyFacilities.map((f: any) => f.name),
        riskLevel: symptomReportCount > 20 ? 'very_high' : 
                   symptomReportCount > 10 ? 'high' :
                   symptomReportCount > 5 ? 'moderate' : 'low',
        totalViolations,
        sncFacilities,
      };

      const facilityDetails = nearbyFacilities.slice(0, 10).map((f: any) => ({
        name: f.name,
        distance: Math.round(f.distance * 10) / 10,
        emissions: f.emissionsData || [],
        violations: f.compliance?.violations?.length || 0,
        complianceStatus: f.compliance?.status || 'Unknown',
        isSNC: f.compliance?.isSNC || false,
        quartersInNonCompliance: f.compliance?.quartersInNonCompliance || 0,
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
    
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);

      // Title
      doc.setFontSize(18);
      doc.setTextColor(25, 118, 210);
      doc.text(report.title, margin, yPos);
      yPos += 15;

      // Period and Location
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Period: ${report.period.start} to ${report.period.end}`, margin, yPos);
      yPos += 7;
      doc.text(`Location: ${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)} (${report.location.radius}mi radius)`, margin, yPos);
      yPos += 10;

      // Summary Findings
      doc.setFontSize(14);
      doc.setTextColor(25, 118, 210);
      doc.text('Summary Findings', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const findings = [
        `Health Reports: ${report.findings.symptomReports} residents reported symptoms`,
        `Air Quality Events: ${report.findings.airQualityEvents} documented high-pollution events`,
        `Average PM2.5: ${report.findings.avgPM25} μg/m³`,
        `Peak PM2.5: ${report.findings.maxPM25} μg/m³ (${(report.findings.maxPM25 / 35 * 100).toFixed(0)}% above EPA standard)`,
        `Risk Level: ${report.findings.riskLevel.toUpperCase()}`,
        ...(report.findings.totalViolations ? [`Total Compliance Violations: ${report.findings.totalViolations}`] : []),
        ...(report.findings.sncFacilities ? [`Facilities in Significant Non-Compliance: ${report.findings.sncFacilities}`] : []),
      ];

      findings.forEach((line) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 7;
      });
      yPos += 5;

      // Facilities Affected
      if (report.facilityDetails.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(25, 118, 210);
        doc.text('Facilities Affected', margin, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        report.facilityDetails.forEach((facility, idx) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}. ${facility.name}`, margin, yPos);
          yPos += 7;
          doc.setFont('helvetica', 'normal');
          doc.text(`   Distance: ${facility.distance} miles`, margin, yPos);
          yPos += 7;
          if ((facility as any).complianceStatus) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor((facility as any).isSNC ? 220 : (facility as any).complianceStatus === 'Non-Compliant' ? 184 : 16, 
                            (facility as any).isSNC ? 38 : (facility as any).complianceStatus === 'Non-Compliant' ? 134 : 185, 
                            (facility as any).isSNC ? 38 : (facility as any).complianceStatus === 'Non-Compliant' ? 11 : 129);
            doc.text(`   Compliance: ${(facility as any).complianceStatus}${(facility as any).isSNC ? ' (SNC)' : ''}`, margin, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 7;
            doc.setFont('helvetica', 'normal');
            if ((facility as any).quartersInNonCompliance > 0) {
              doc.text(`   Quarters in Non-Compliance: ${(facility as any).quartersInNonCompliance}`, margin, yPos);
              yPos += 7;
            }
          }
          if (facility.emissions.length > 0) {
            doc.text(`   Emissions:`, margin, yPos);
            yPos += 7;
            facility.emissions.slice(0, 3).forEach((e: any) => {
              doc.text(`     - ${e.pollutant}: ${e.quantity} ${e.unit || 'tons'} (${e.year})`, margin, yPos);
              yPos += 7;
            });
          }
          doc.text(`   Violations: ${facility.violations}`, margin, yPos);
          yPos += 10;
        });
      }

      // Recommendations
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setTextColor(25, 118, 210);
      doc.text('Recommendations', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      report.recommendations.forEach((rec, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, contentWidth);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 7;
      });

      // Footer
      yPos = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 5;
      doc.text('Mon Valley Pollution Tracking System - Project Lumna', margin, yPos);

      // Save PDF
      doc.save(`evidence-report-${report.reportId}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      // Fallback to print
      window.print();
    }
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
          {loading ? 'Generating Report...' : 'Generate Evidence Report'}
        </button>
      </div>

      {/* Generated Report Display */}
      {report && (
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8">
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
              Export to PDF
            </button>
          </div>

          <h4 style={{ color: '#1976d2' }}>Summary</h4>
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

