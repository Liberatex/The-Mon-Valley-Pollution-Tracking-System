/**
 * Tests for Aggregation Pipeline
 */

import { aggregateDailyReports, aggregateWeeklyReports, aggregateMonthlyReports } from '../src/aggregateHealthData';
import * as admin from 'firebase-admin';

// Mock Firestore
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            docs: [],
            empty: true,
          })),
        })),
        get: jest.fn(() => Promise.resolve({
          docs: [],
          empty: true,
        })),
      })),
      doc: jest.fn(() => ({
        set: jest.fn(() => Promise.resolve()),
        get: jest.fn(() => Promise.resolve({
          exists: false,
        })),
      })),
    })),
  })),
}));

describe('Aggregation Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('aggregateDailyReports returns correct structure', async () => {
    const date = '2024-12-16';
    const aggregate = await aggregateDailyReports(date);

    expect(aggregate).toHaveProperty('date', date);
    expect(aggregate).toHaveProperty('totalReports');
    expect(aggregate).toHaveProperty('symptoms');
    expect(aggregate).toHaveProperty('severity');
    expect(aggregate).toHaveProperty('geographic');
    expect(aggregate).toHaveProperty('metadata');
    expect(aggregate.metadata.source).toBe('aggregation_pipeline');
  });

  test('aggregateWeeklyReports returns correct structure', async () => {
    const weekStart = '2024-12-09';
    const aggregate = await aggregateWeeklyReports(weekStart);

    expect(aggregate).toHaveProperty('weekStart', weekStart);
    expect(aggregate).toHaveProperty('weekEnd');
    expect(aggregate).toHaveProperty('totalReports');
    expect(aggregate).toHaveProperty('avgDailyReports');
    expect(aggregate).toHaveProperty('symptoms');
    expect(aggregate).toHaveProperty('severity');
  });

  test('aggregateMonthlyReports returns correct structure', async () => {
    const month = '2024-12';
    const aggregate = await aggregateMonthlyReports(month);

    expect(aggregate).toHaveProperty('month', month);
    expect(aggregate).toHaveProperty('totalReports');
    expect(aggregate).toHaveProperty('avgDailyReports');
    expect(aggregate).toHaveProperty('trends');
    expect(aggregate.trends).toHaveProperty('reportGrowth');
    expect(aggregate.trends).toHaveProperty('symptomTrends');
  });
});

