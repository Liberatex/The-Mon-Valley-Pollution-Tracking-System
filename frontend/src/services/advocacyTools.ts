/**
 * Advanced Advocacy Tools
 * Time-series correlation, triangulation, cumulative impact
 */

import jsPDF from 'jspdf';

export interface CorrelationData {
  timestamp: Date;
  pm25: number;
  symptomReports: number;
  complianceEvents: number;
  correlation: number; // 0-1 correlation coefficient
}

export interface TriangulationResult {
  sensorData: Array<{ timestamp: Date; pm25: number; location: { lat: number; lng: number } }>;
  humanReports: Array<{ timestamp: Date; symptoms: string[]; location: { lat: number; lng: number } }>;
  regulatoryData: Array<{ timestamp: Date; violation: string; facility: string }>;
  correlation: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculate correlation between sensor data and symptom reports
 */
export function calculateCorrelation(
  sensorData: Array<{ timestamp: Date; pm25: number }>,
  symptomReports: Array<{ timestamp: Date; count: number }>
): CorrelationData[] {
  const correlations: CorrelationData[] = [];

  // Group by hour
  const hourlyData: Record<string, { pm25: number[]; symptoms: number[] }> = {};

  sensorData.forEach((data) => {
    const hour = new Date(data.timestamp).toISOString().slice(0, 13);
    if (!hourlyData[hour]) {
      hourlyData[hour] = { pm25: [], symptoms: [] };
    }
    hourlyData[hour].pm25.push(data.pm25);
  });

  symptomReports.forEach((report) => {
    const hour = new Date(report.timestamp).toISOString().slice(0, 13);
    if (!hourlyData[hour]) {
      hourlyData[hour] = { pm25: [], symptoms: [] };
    }
    hourlyData[hour].symptoms.push(report.count);
  });

  // Calculate correlation for each hour
  Object.entries(hourlyData).forEach(([hour, data]) => {
    if (data.pm25.length > 0 && data.symptoms.length > 0) {
      const avgPM25 = data.pm25.reduce((sum, val) => sum + val, 0) / data.pm25.length;
      const avgSymptoms = data.symptoms.reduce((sum, val) => sum + val, 0) / data.symptoms.length;

      // Simple correlation (Pearson would be more accurate)
      const correlation = Math.min(1, avgSymptoms / Math.max(1, avgPM25 / 10));

      correlations.push({
        timestamp: new Date(hour),
        pm25: avgPM25,
        symptomReports: avgSymptoms,
        complianceEvents: 0,
        correlation,
      });
    }
  });

  return correlations;
}

/**
 * Triangulate sensor data, human reports, and regulatory data
 */
export function triangulateData(
  sensorData: Array<{ timestamp: Date; pm25: number; location: { lat: number; lng: number } }>,
  humanReports: Array<{ timestamp: Date; symptoms: string[]; location: { lat: number; lng: number } }>,
  regulatoryData: Array<{ timestamp: Date; violation: string; facility: string }>
): TriangulationResult {
  // Find overlapping time windows
  const timeWindow = 60 * 60 * 1000; // 1 hour window
  let matches = 0;
  let totalWindows = 0;

  sensorData.forEach((sensor) => {
    const windowStart = sensor.timestamp.getTime();
    const windowEnd = windowStart + timeWindow;

    const nearbyReports = humanReports.filter((report) => {
      const reportTime = report.timestamp.getTime();
      const distance = Math.sqrt(
        Math.pow(report.location.lat - sensor.location.lat, 2) +
          Math.pow(report.location.lng - sensor.location.lng, 2)
      );
      return (
        reportTime >= windowStart &&
        reportTime <= windowEnd &&
        distance < 0.02 // ~2km
      );
    });

    const nearbyViolations = regulatoryData.filter((violation) => {
      const violationTime = violation.timestamp.getTime();
      return violationTime >= windowStart && violationTime <= windowEnd;
    });

    if (nearbyReports.length > 0 || nearbyViolations.length > 0) {
      matches++;
    }
    totalWindows++;
  });

  const correlation = totalWindows > 0 ? matches / totalWindows : 0;

  let confidence: TriangulationResult['confidence'] = 'low';
  if (correlation > 0.7) {
    confidence = 'high';
  } else if (correlation > 0.4) {
    confidence = 'medium';
  }

  return {
    sensorData,
    humanReports,
    regulatoryData,
    correlation,
    confidence,
  };
}

/**
 * Generate advocacy PDF report
 */
export function generateAdvocacyReport(
  triangulation: TriangulationResult,
  facilityName: string,
  dateRange: { start: Date; end: Date }
): jsPDF {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.text('Air Quality Advocacy Report', 20, yPos);
  yPos += 10;

  // Facility and date range
  doc.setFontSize(12);
  doc.text(`Facility: ${facilityName}`, 20, yPos);
  yPos += 7;
  doc.text(
    `Date Range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
    20,
    yPos
  );
  yPos += 15;

  // Triangulation summary
  doc.setFontSize(14);
  doc.text('Data Triangulation Summary', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`Correlation: ${(triangulation.correlation * 100).toFixed(1)}%`, 20, yPos);
  yPos += 7;
  doc.text(`Confidence: ${triangulation.confidence}`, 20, yPos);
  yPos += 7;
  doc.text(`Sensor Data Points: ${triangulation.sensorData.length}`, 20, yPos);
  yPos += 7;
  doc.text(`Human Reports: ${triangulation.humanReports.length}`, 20, yPos);
  yPos += 7;
  doc.text(`Regulatory Violations: ${triangulation.regulatoryData.length}`, 20, yPos);
  yPos += 15;

  // Key findings
  doc.setFontSize(14);
  doc.text('Key Findings', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  if (triangulation.correlation > 0.5) {
    doc.text(
      '✓ Strong correlation between sensor data, human reports, and regulatory violations.',
      20,
      yPos
    );
    yPos += 7;
  }

  if (triangulation.sensorData.length > 0) {
    const maxPM25 = Math.max(...triangulation.sensorData.map((d) => d.pm25));
    doc.text(`Maximum PM2.5 recorded: ${maxPM25.toFixed(2)} μg/m³`, 20, yPos);
    yPos += 7;
  }

  // Recommendations
  doc.setFontSize(14);
  doc.text('Recommendations', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(
    '1. File regulatory complaint with documented evidence',
    20,
    yPos
  );
  yPos += 7;
  doc.text('2. Request cumulative impact assessment', 20, yPos);
  yPos += 7;
  doc.text('3. Engage community health advocates', 20, yPos);

  return doc;
}

/**
 * Calculate cumulative impact over time period
 */
export function calculateCumulativeImpact(
  sensorData: Array<{ timestamp: Date; pm25: number }>,
  startDate: Date,
  endDate: Date
): {
  totalExposure: number; // μg/m³ × hours
  averagePM25: number;
  exceedanceDays: number; // Days exceeding 35.4 μg/m³
  peakPM25: number;
} {
  const filtered = sensorData.filter(
    (d) => d.timestamp >= startDate && d.timestamp <= endDate
  );

  if (filtered.length === 0) {
    return {
      totalExposure: 0,
      averagePM25: 0,
      exceedanceDays: 0,
      peakPM25: 0,
    };
  }

  const totalPM25 = filtered.reduce((sum, d) => sum + d.pm25, 0);
  const averagePM25 = totalPM25 / filtered.length;
  const peakPM25 = Math.max(...filtered.map((d) => d.pm25));

  // Count days exceeding EPA 24-hour standard (35.4 μg/m³)
  const dailyAverages: Record<string, number[]> = {};
  filtered.forEach((d) => {
    const day = d.timestamp.toISOString().slice(0, 10);
    if (!dailyAverages[day]) {
      dailyAverages[day] = [];
    }
    dailyAverages[day].push(d.pm25);
  });

  let exceedanceDays = 0;
  Object.values(dailyAverages).forEach((readings) => {
    const dailyAvg = readings.reduce((sum, val) => sum + val, 0) / readings.length;
    if (dailyAvg > 35.4) {
      exceedanceDays++;
    }
  });

  // Estimate total exposure (μg/m³ × hours)
  const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const totalExposure = averagePM25 * hours;

  return {
    totalExposure,
    averagePM25,
    exceedanceDays,
    peakPM25,
  };
}

