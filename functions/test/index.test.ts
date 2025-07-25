describe('Cloud Functions', () => {
  it('should have processSensorData function exported', () => {
    // Import the functions module
    const functions = require('../src/index');
    expect(functions.processSensorData).toBeDefined();
  });

  it('should have submitSymptomReport function exported', () => {
    const functions = require('../src/index');
    expect(functions.submitSymptomReport).toBeDefined();
  });

  it('should have scheduledFirestoreBackup function exported', () => {
    const functions = require('../src/index');
    expect(functions.scheduledFirestoreBackup).toBeDefined();
  });

  it('should have fetchPurpleAirSensorData function exported', () => {
    const functions = require('../src/index');
    expect(functions.fetchPurpleAirSensorData).toBeDefined();
  });

  it('should have fetchNASASatelliteData function exported', () => {
    const functions = require('../src/index');
    expect(functions.fetchNASASatelliteData).toBeDefined();
  });
}); 