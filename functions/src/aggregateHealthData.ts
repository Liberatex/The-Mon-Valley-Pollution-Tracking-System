/**
 * Health Data Aggregation Pipeline
 * 
 * Aggregates symptom reports into daily/weekly/monthly summaries
 * for analytics and reporting (no PHI in aggregates)
 * 
 * HIPAA-Compliant: Only aggregated data, no individual identifiers
 */

import * as admin from "firebase-admin";
import * as functions from 'firebase-functions/v1';

interface SymptomReport {
  pseudoId: string;
  age: number | null;
  symptoms: string[];
  severity: number;
  osac: any;
  submittedAt: string;
  location: {
    lat: number;
    lng: number;
  } | null;
}

interface DailyAggregate {
  date: string; // YYYY-MM-DD
  totalReports: number;
  symptoms: { [key: string]: number };
  severity: {
    mild: number;
    moderate: number;
    severe: number;
    very_severe: number;
    extreme: number;
  };
  geographic: { [zipCode: string]: number }; // Aggregated by zip code
  avgPM25: number | null;
  maxPM25: number | null;
  correlationScore: number | null; // Correlation with air quality
  metadata: {
    generatedAt: string;
    source: 'aggregation_pipeline';
    version: '1.0';
  };
}

interface WeeklyAggregate {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  totalReports: number;
  avgDailyReports: number;
  symptoms: { [key: string]: number };
  severity: {
    mild: number;
    moderate: number;
    severe: number;
    very_severe: number;
    extreme: number;
  };
  geographic: { [zipCode: string]: number };
  avgPM25: number | null;
  maxPM25: number | null;
  correlationScore: number | null;
  metadata: {
    generatedAt: string;
    source: 'aggregation_pipeline';
    version: '1.0';
  };
}

interface MonthlyAggregate {
  month: string; // YYYY-MM
  totalReports: number;
  avgDailyReports: number;
  symptoms: { [key: string]: number };
  severity: {
    mild: number;
    moderate: number;
    severe: number;
    very_severe: number;
    extreme: number;
  };
  geographic: { [zipCode: string]: number };
  avgPM25: number | null;
  maxPM25: number | null;
  correlationScore: number | null;
  trends: {
    reportGrowth: number; // % change from previous month
    symptomTrends: { [key: string]: number }; // % change per symptom
  };
  metadata: {
    generatedAt: string;
    source: 'aggregation_pipeline';
    version: '1.0';
  };
}

// Helper: Get zip code from lat/lng (simplified - uses approximate boundaries)
function getZipCodeFromLocation(lat: number, lng: number): string {
  // Mon Valley zip codes (approximate)
  // This is simplified - in production, use a proper geocoding service
  if (lat >= 40.35 && lat <= 40.45 && lng >= -79.95 && lng <= -79.85) {
    return '15227'; // Clairton area
  } else if (lat >= 40.38 && lat <= 40.42 && lng >= -79.88 && lng <= -79.85) {
    return '15104'; // Braddock area
  } else if (lat >= 40.34 && lat <= 40.36 && lng >= -79.90 && lng <= -79.88) {
    return '15034'; // Dravosburg area
  } else if (lat >= 40.25 && lat <= 40.35 && lng >= -79.95 && lng <= -79.85) {
    return '15210'; // South Hills area
  }
  return 'unknown';
}

// Helper: Get severity category
function getSeverityCategory(severity: number): 'mild' | 'moderate' | 'severe' | 'very_severe' | 'extreme' {
  if (severity <= 1) return 'mild';
  if (severity <= 2) return 'moderate';
  if (severity <= 3) return 'severe';
  if (severity <= 4) return 'very_severe';
  return 'extreme';
}

// Helper: Calculate correlation with air quality
async function calculateCorrelationScore(
  reports: SymptomReport[],
  date: string
): Promise<number | null> {
  try {
    // Fetch air quality data for the date
    // This is a simplified correlation - in production, use actual ACHD data
    const avgPM25 = 45.2; // Would come from actual sensor data
    
    // Simple correlation: More reports on high PM2.5 days = higher correlation
    const reportCount = reports.length;
    const correlation = Math.min(1.0, (reportCount / 50) * (avgPM25 / 100));
    
    return Math.round(correlation * 100) / 100;
  } catch (error) {
    console.warn('Could not calculate correlation:', error);
    return null;
  }
}

/**
 * Aggregate daily symptom reports
 */
export async function aggregateDailyReports(date: string): Promise<DailyAggregate> {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  // Fetch reports for the date
  const reportsSnapshot = await admin.firestore()
    .collection('symptomReports')
    .where('submittedAt', '>=', startDate.toISOString())
    .where('submittedAt', '<=', endDate.toISOString())
    .get();

  const reports = reportsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data
    } as unknown as SymptomReport;
  });

  // Aggregate symptoms
  const symptoms: { [key: string]: number } = {};
  const severity: DailyAggregate['severity'] = {
    mild: 0,
    moderate: 0,
    severe: 0,
    very_severe: 0,
    extreme: 0
  };
  const geographic: { [zipCode: string]: number } = {};

  reports.forEach(report => {
    // Count symptoms
    if (report.symptoms && Array.isArray(report.symptoms)) {
      report.symptoms.forEach((symptom: string) => {
        symptoms[symptom] = (symptoms[symptom] || 0) + 1;
      });
    }

    // Count severity
    const category = getSeverityCategory(report.severity || 1);
    severity[category]++;

    // Count geographic distribution
    if (report.location) {
      const zipCode = getZipCodeFromLocation(report.location.lat, report.location.lng);
      geographic[zipCode] = (geographic[zipCode] || 0) + 1;
    }
  });

  // Calculate correlation
  const correlationScore = await calculateCorrelationScore(reports, date);

  const aggregate: DailyAggregate = {
    date,
    totalReports: reports.length,
    symptoms,
    severity,
    geographic,
    avgPM25: null, // Would come from sensor data
    maxPM25: null, // Would come from sensor data
    correlationScore,
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'aggregation_pipeline',
      version: '1.0'
    }
  };

  return aggregate;
}

/**
 * Aggregate weekly symptom reports
 */
export async function aggregateWeeklyReports(weekStart: string): Promise<WeeklyAggregate> {
  const startDate = new Date(weekStart);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  // Fetch reports for the week
  const reportsSnapshot = await admin.firestore()
    .collection('symptomReports')
    .where('submittedAt', '>=', startDate.toISOString())
    .where('submittedAt', '<=', endDate.toISOString())
    .get();

  const reports = reportsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data
    } as unknown as SymptomReport;
  });

  // Aggregate (same logic as daily)
  const symptoms: { [key: string]: number } = {};
  const severity: WeeklyAggregate['severity'] = {
    mild: 0,
    moderate: 0,
    severe: 0,
    very_severe: 0,
    extreme: 0
  };
  const geographic: { [zipCode: string]: number } = {};

  reports.forEach(report => {
    if (report.symptoms && Array.isArray(report.symptoms)) {
      report.symptoms.forEach((symptom: string) => {
        symptoms[symptom] = (symptoms[symptom] || 0) + 1;
      });
    }
    const category = getSeverityCategory(report.severity || 1);
    severity[category]++;
    if (report.location) {
      const zipCode = getZipCodeFromLocation(report.location.lat, report.location.lng);
      geographic[zipCode] = (geographic[zipCode] || 0) + 1;
    }
  });

  const correlationScore = await calculateCorrelationScore(reports, weekStart);

  const weekEnd = new Date(endDate).toISOString().split('T')[0];

  const aggregate: WeeklyAggregate = {
    weekStart,
    weekEnd,
    totalReports: reports.length,
    avgDailyReports: Math.round((reports.length / 7) * 10) / 10,
    symptoms,
    severity,
    geographic,
    avgPM25: null,
    maxPM25: null,
    correlationScore,
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'aggregation_pipeline',
      version: '1.0'
    }
  };

  return aggregate;
}

/**
 * Aggregate monthly symptom reports
 */
export async function aggregateMonthlyReports(month: string): Promise<MonthlyAggregate> {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, monthNum, 0);
  endDate.setHours(23, 59, 59, 999);

  // Fetch reports for the month
  const reportsSnapshot = await admin.firestore()
    .collection('symptomReports')
    .where('submittedAt', '>=', startDate.toISOString())
    .where('submittedAt', '<=', endDate.toISOString())
    .get();

  const reports = reportsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data
    } as unknown as SymptomReport;
  });

  // Aggregate
  const symptoms: { [key: string]: number } = {};
  const severity: MonthlyAggregate['severity'] = {
    mild: 0,
    moderate: 0,
    severe: 0,
    very_severe: 0,
    extreme: 0
  };
  const geographic: { [zipCode: string]: number } = {};

  reports.forEach(report => {
    if (report.symptoms && Array.isArray(report.symptoms)) {
      report.symptoms.forEach((symptom: string) => {
        symptoms[symptom] = (symptoms[symptom] || 0) + 1;
      });
    }
    const category = getSeverityCategory(report.severity || 1);
    severity[category]++;
    if (report.location) {
      const zipCode = getZipCodeFromLocation(report.location.lat, report.location.lng);
      geographic[zipCode] = (geographic[zipCode] || 0) + 1;
    }
  });

  const correlationScore = await calculateCorrelationScore(reports, month);

  // Calculate trends (compare with previous month)
  const prevMonth = new Date(year, monthNum - 2, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  
  let reportGrowth = 0;
  const symptomTrends: { [key: string]: number } = {};
  
  try {
    const prevMonthAggregate = await admin.firestore()
      .collection('symptomReportAggregates')
      .doc(`monthly_${prevMonthStr}`)
      .get();
    
    if (prevMonthAggregate.exists) {
      const prevData = prevMonthAggregate.data() as MonthlyAggregate;
      reportGrowth = prevData.totalReports > 0
        ? Math.round(((reports.length - prevData.totalReports) / prevData.totalReports) * 100 * 10) / 10
        : 100;
      
      // Calculate symptom trends
      Object.keys(symptoms).forEach(symptom => {
        const prevCount = prevData.symptoms[symptom] || 0;
        symptomTrends[symptom] = prevCount > 0
          ? Math.round(((symptoms[symptom] - prevCount) / prevCount) * 100 * 10) / 10
          : 100;
      });
    }
  } catch (error) {
    console.warn('Could not calculate trends:', error);
  }

  const daysInMonth = endDate.getDate();
  const aggregate: MonthlyAggregate = {
    month,
    totalReports: reports.length,
    avgDailyReports: Math.round((reports.length / daysInMonth) * 10) / 10,
    symptoms,
    severity,
    geographic,
    avgPM25: null,
    maxPM25: null,
    correlationScore,
    trends: {
      reportGrowth,
      symptomTrends
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'aggregation_pipeline',
      version: '1.0'
    }
  };

  return aggregate;
}

/**
 * Cloud Function: Daily aggregation (runs at midnight)
 */
export const aggregateDailyHealthData = functions.pubsub.schedule('0 0 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      console.log(`Aggregating daily health data for ${dateStr}`);

      const aggregate = await aggregateDailyReports(dateStr);

      // Store in Firestore
      await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`daily_${dateStr}`)
        .set(aggregate);

      console.log(`✅ Daily aggregate created for ${dateStr}: ${aggregate.totalReports} reports`);

      return null;
    } catch (error: any) {
      console.error('Error in daily aggregation:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Weekly aggregation (runs Monday at 1 AM)
 */
export const aggregateWeeklyHealthData = functions.pubsub.schedule('0 1 * * 1')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const lastMonday = new Date();
      const day = lastMonday.getDay();
      const diff = lastMonday.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      lastMonday.setDate(diff);
      lastMonday.setHours(0, 0, 0, 0);
      const weekStartStr = lastMonday.toISOString().split('T')[0];

      console.log(`Aggregating weekly health data for week starting ${weekStartStr}`);

      const aggregate = await aggregateWeeklyReports(weekStartStr);

      // Store in Firestore
      await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`weekly_${weekStartStr}`)
        .set(aggregate);

      console.log(`✅ Weekly aggregate created: ${aggregate.totalReports} reports`);

      return null;
    } catch (error: any) {
      console.error('Error in weekly aggregation:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Monthly aggregation (runs 1st of month at 2 AM)
 */
export const aggregateMonthlyHealthData = functions.pubsub.schedule('0 2 1 * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      console.log(`Aggregating monthly health data for ${monthStr}`);

      const aggregate = await aggregateMonthlyReports(monthStr);

      // Store in Firestore
      await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`monthly_${monthStr}`)
        .set(aggregate);

      console.log(`✅ Monthly aggregate created: ${aggregate.totalReports} reports`);

      return null;
    } catch (error: any) {
      console.error('Error in monthly aggregation:', error);
      throw error;
    }
  });

/**
 * Manual trigger: Aggregate specific date range
 */
export const aggregateHealthDataManual = functions.https.onRequest(async (req, res) => {
  try {
    const { type, date } = req.body;

    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      res.status(400).json({ error: 'Invalid type. Use: daily, weekly, or monthly' });
      return;
    }

    let aggregate: any;

    if (type === 'daily') {
      const dateStr = date || new Date().toISOString().split('T')[0];
      aggregate = await aggregateDailyReports(dateStr);
      await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`daily_${dateStr}`)
        .set(aggregate);
    } else if (type === 'weekly') {
      const weekStart = date || (() => {
        const monday = new Date();
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        return monday.toISOString().split('T')[0];
      })();
      aggregate = await aggregateWeeklyReports(weekStart);
      await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`weekly_${weekStart}`)
        .set(aggregate);
    } else if (type === 'monthly') {
      const month = date || (() => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      })();
      aggregate = await aggregateMonthlyReports(month);
      await admin.firestore()
        .collection('symptomReportAggregates')
        .doc(`monthly_${month}`)
        .set(aggregate);
    }

    res.json({
      success: true,
      type,
      aggregate,
      message: `${type} aggregate created successfully`
    });
  } catch (error: any) {
    console.error('Error in manual aggregation:', error);
    res.status(500).json({
      error: 'Failed to aggregate health data',
      message: error.message
    });
  }
});

