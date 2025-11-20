#!/usr/bin/env node
/**
 * Script to seed Title V facilities in production Firestore
 * Uses Firebase Admin SDK directly (no auth required)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'mv-pollution-tracking-system'
  });
}

const MON_VALLEY_FACILITIES = [
  {
    facilityId: 'PA-CLAIRTON-001',
    name: 'U.S. Steel Clairton Coke Works',
    operator: 'United States Steel Corporation',
    location: {
      lat: 40.2925,
      lng: -79.8814,
      address: '400 State Street',
      city: 'Clairton',
      state: 'PA',
      zip: '15025'
    },
    permitId: 'TV-04-00001',
    permitType: 'Title V Operating Permit',
    issuedDate: '2020-01-15',
    expirationDate: '2025-01-15',
    naicsCode: '331110',
    processes: ['Coke production', 'Coal processing', 'By-product recovery'],
    permittedPollutants: [
      { pollutant: 'PM2.5', limit: 100, unit: 'tons/year', averagingPeriod: 'annual' },
      { pollutant: 'SO2', casNumber: '7446-09-5', limit: 500, unit: 'tons/year', averagingPeriod: 'annual' },
      { pollutant: 'NOx', limit: 250, unit: 'tons/year', averagingPeriod: 'annual' },
      { pollutant: 'VOCs', limit: 150, unit: 'tons/year', averagingPeriod: 'annual' }
    ],
    emissionsData: [
      { year: 2023, pollutant: 'PM2.5', quantity: 89.5, unit: 'tons/year', source: 'EPA NEI' },
      { year: 2023, pollutant: 'SO2', quantity: 445.2, unit: 'tons/year', source: 'EPA NEI' }
    ],
    jurisdiction: 'Allegheny County',
    regulatoryAgency: 'Allegheny County Health Department',
    lastInspection: '2024-09-15',
    violations: [
      { date: '2023-12-25', description: 'Fire at Battery 19-4 resulted in excess emissions', status: 'resolved' }
    ],
    metadata: {
      dataSource: 'EPA ECHO / ACHD',
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  },
  {
    facilityId: 'PA-BRADDOCK-001',
    name: 'Edgar Thomson Steel Works',
    operator: 'United States Steel Corporation',
    location: {
      lat: 40.4006,
      lng: -79.8639,
      address: '301 Talbot Avenue',
      city: 'Braddock',
      state: 'PA',
      zip: '15104'
    },
    permitId: 'TV-04-00002',
    permitType: 'Title V Operating Permit',
    issuedDate: '2019-06-01',
    expirationDate: '2024-06-01',
    naicsCode: '331110',
    processes: ['Blast furnace operations', 'Steel production', 'Continuous casting'],
    permittedPollutants: [
      { pollutant: 'PM2.5', limit: 75, unit: 'tons/year', averagingPeriod: 'annual' },
      { pollutant: 'PM10', limit: 150, unit: 'tons/year', averagingPeriod: 'annual' },
      { pollutant: 'NOx', limit: 300, unit: 'tons/year', averagingPeriod: 'annual' }
    ],
    emissionsData: [
      { year: 2023, pollutant: 'PM2.5', quantity: 68.3, unit: 'tons/year', source: 'EPA NEI' }
    ],
    jurisdiction: 'Allegheny County',
    regulatoryAgency: 'Allegheny County Health Department',
    lastInspection: '2024-08-22',
    metadata: {
      dataSource: 'EPA ECHO / ACHD',
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  },
  {
    facilityId: 'PA-DRAVOSBURG-001',
    name: 'Irvin Plant',
    operator: 'United States Steel Corporation',
    location: {
      lat: 40.3506,
      lng: -79.8867,
      address: '100 River Road',
      city: 'Dravosburg',
      state: 'PA',
      zip: '15034'
    },
    permitId: 'TV-04-00003',
    permitType: 'Title V Operating Permit',
    issuedDate: '2021-03-10',
    expirationDate: '2026-03-10',
    naicsCode: '331110',
    processes: ['Hot strip mill', 'Cold rolling', 'Coating operations'],
    permittedPollutants: [
      { pollutant: 'PM2.5', limit: 50, unit: 'tons/year', averagingPeriod: 'annual' },
      { pollutant: 'VOCs', limit: 100, unit: 'tons/year', averagingPeriod: 'annual' }
    ],
    jurisdiction: 'Allegheny County',
    regulatoryAgency: 'Allegheny County Health Department',
    metadata: {
      dataSource: 'EPA ECHO / ACHD',
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  }
];

async function seedFacilities() {
  try {
    console.log('🌱 Seeding Title V facilities to production Firestore...');
    
    const db = admin.firestore();
    const batch = db.batch();
    const facilitiesRef = db.collection('titleVFacilities');
    
    for (const facility of MON_VALLEY_FACILITIES) {
      const docRef = facilitiesRef.doc(facility.facilityId);
      const facilityWithTimestamp = {
        ...facility,
        metadata: {
          ...facility.metadata,
          lastUpdated: new Date().toISOString()
        }
      };
      batch.set(docRef, facilityWithTimestamp);
      console.log(`  ✓ Prepared ${facility.name}`);
    }
    
    await batch.commit();
    
    console.log(`\n✅ Successfully seeded ${MON_VALLEY_FACILITIES.length} Title V facilities!`);
    console.log('🎉 Title V facilities should now appear on the Sensor Map.');
    
    // Verify
    const snapshot = await facilitiesRef.get();
    console.log(`\n🔍 Verification: ${snapshot.size} facilities found in Firestore`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding facilities:', error);
    process.exit(1);
  }
}

seedFacilities();

