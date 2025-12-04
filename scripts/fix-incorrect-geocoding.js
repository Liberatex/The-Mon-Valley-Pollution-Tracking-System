/**
 * Script to fix incorrectly geocoded VCAN addresses
 * Re-geocodes addresses that were placed at wrong locations
 */

const fs = require('fs');
const path = require('path');

// Read current coordinates
const coordsFile = path.join(__dirname, '../frontend/src/services/vcanDistributionCoordinates.ts');
const coordsContent = fs.readFileSync(coordsFile, 'utf8');

// Mon Valley bounds for validation
const MON_VALLEY_BOUNDS = {
  minLat: 40.20,
  maxLat: 40.45,
  minLng: -80.05,
  maxLng: -79.70,
};

// Problematic coordinates to fix
const PROBLEMATIC_COORDS = [
  { lat: 40.838634, lng: -79.43735 }, // Default fallback
  { lat: 41.256607, lng: -76.43419 }, // Way outside (NY area)
  { lat: 39.858269, lng: -77.698018 }, // Way outside (MD area)
  { lat: 41.098296, lng: -74.689007 }, // Way outside (NY area)
  { lat: 41.09114, lng: -78.290746 }, // Way outside (NY area)
  { lat: 39.393189, lng: -79.871763 }, // Outside bounds
  { lat: 39.930379, lng: -80.059548 }, // Outside bounds
  { lat: 40.685404, lng: -75.242033 }, // Way outside (PA but wrong area)
  { lat: 40.681377, lng: -76.89428 }, // Way outside
];

function isInMonValley(lat, lng) {
  return lat >= MON_VALLEY_BOUNDS.minLat && 
         lat <= MON_VALLEY_BOUNDS.maxLat &&
         lng >= MON_VALLEY_BOUNDS.minLng && 
         lng <= MON_VALLEY_BOUNDS.maxLng;
}

function isProblematic(lat, lng) {
  return PROBLEMATIC_COORDS.some(p => 
    Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lng - lng) < 0.001
  ) || !isInMonValley(lat, lng);
}

// Extract addresses that need fixing
const problematicAddresses = [];
const lines = coordsContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const addressMatch = line.match(/^  "([^"]+)":/);
  const coordsMatch = line.match(/lat: ([0-9.]+), lng: ([0-9.-]+)/);
  
  if (addressMatch && coordsMatch) {
    const address = addressMatch[1];
    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    
    if (isProblematic(lat, lng)) {
      problematicAddresses.push({ address, lat, lng, lineNumber: i + 1 });
    }
  }
}

console.log(`Found ${problematicAddresses.length} addresses with incorrect geocoding\n`);

// Address fixes - map incomplete addresses to complete ones
const addressFixes = {
  // Addresses missing zip codes or city info
  "352 Halcomb Ave, Mon Valley, ": "352 Halcomb Ave, Clairton, PA 15025",
  "1213 Marion Circle, Mon Valley, ": "1213 Marion Circle, Clairton, PA 15025",
  "1206 Marion Circle, Mon Valley, ": "1206 Marion Circle, Clairton, PA 15025",
  "249 Shaw Ave, Mon Valley, ": "249 Shaw Ave, Clairton, PA 15025",
  "634 Reed St, Mon Valley, ": "634 Reed St, Clairton, PA 15025",
  "533 Wylie Ave, Mon Valley, ": "533 Wylie Ave, Clairton, PA 15025",
  "206 Mendelsohn Ave, Mon Valley, ": "206 Mendelsohn Ave, Clairton, PA 15025",
  "6301 Soltis Drive, Mon Valley, ": "6301 Soltis Drive, Clairton, PA 15025",
  "1540 Gilmore Drive, Mon Valley, ": "1540 Gilmore Drive, Clairton, PA 15025",
  "829 Vankirk St, Mon Valley, ": "829 Vankirk St, Clairton, PA 15025",
  "427 Saint Clair Ave, Mon Valley, ": "427 Saint Clair Ave, Clairton, PA 15025",
  "341 Baker Ave, Mon Valley, ": "341 Baker Ave, Clairton, PA 15025",
  "337 Shaw 15025, Mon Valley, 15025": "337 Shaw Ave, Clairton, PA 15025",
  "1105 Gary Ave 15025, Mon Valley, 15025": "1105 Gary Ave, Clairton, PA 15025",
  "1717 Jenny Lind, Mon Valley, ": "1717 Jenny Lind, Clairton, PA 15025",
  "528 Reed Street, Mon Valley, ": "528 Reed Street, Clairton, PA 15025",
  
  // Addresses with wrong coordinates
  "2034 Washington Blvd rear 15045, Monongahela, 15045": "2034 Washington Blvd, Monongahela, PA 15045",
  "1303 Marion Circle 15025, Mon Valley, 15025": "1303 Marion Circle, Clairton, PA 15025",
  "1204 Marion Circle 15032, Mon Valley, 15032": "1204 Marion Circle, McKeesport, PA 15132",
  "1205 Marion Circle 15025, Mon Valley, 15025": "1205 Marion Circle, Clairton, PA 15025",
  "1509 Marion Circle 15025, Mon Valley, 15025": "1509 Marion Circle, Clairton, PA 15025",
  "1110 Marion Circle 15025, Mon Valley, 15025": "1110 Marion Circle, Clairton, PA 15025",
  "1711 Marion Circle 15025, Mon Valley, 15025": "1711 Marion Circle, Clairton, PA 15025",
  "1706 Marion Circle 15025, Mon Valley, 15025": "1706 Marion Circle, Clairton, PA 15025",
  "1707 Marion Circle 15025, Mon Valley, 15025": "1707 Marion Circle, Clairton, PA 15025",
  "1507 Marion Circle 15025, Mon Valley, 15025": "1507 Marion Circle, Clairton, PA 15025",
  "1410 Marion Circle 15025, Mon Valley, 15025": "1410 Marion Circle, Clairton, PA 15025",
  "1502 Marion Circle 15025, Mon Valley, 15025": "1502 Marion Circle, Clairton, PA 15025",
  "1107 Marion Circle 15025, Mon Valley, 15025": "1107 Marion Circle, Clairton, PA 15025",
  "1510 Marion Circle 15025, Mon Valley, 15025": "1510 Marion Circle, Clairton, PA 15025",
  "1506 Marion Circle, 15025, Mon Valley, 15025": "1506 Marion Circle, Clairton, PA 15025",
  "1303 Marion Circle, 15025, Mon Valley, 15025": "1303 Marion Circle, Clairton, PA 15025",
  "759 Lafayette Drive 15025, Mon Valley, 15025": "759 Lafayette Drive, Clairton, PA 15025",
  "552 Lafayette Drive 15025, Mon Valley, 15025": "552 Lafayette Drive, Clairton, PA 15025",
  "352 Lafayette Drive, 15025, Mon Valley, 15025": "352 Lafayette Drive, Clairton, PA 15025",
  "700 Lafayette Drive 15025, Mon Valley, 15025": "700 Lafayette Drive, Clairton, PA 15025",
  "552 Constitution Circle 15025, Mon Valley, 15025": "552 Constitution Circle, Clairton, PA 15025",
  "104 Constitution Circle 15025, Mon Valley, 15025": "104 Constitution Circle, Clairton, PA 15025",
  "134 Kay Way 15025, Mon Valley, 15025": "134 Kay Way, Clairton, PA 15025",
  "6708 McKinley Ct 15025, Mon Valley, 15025": "6708 McKinley Ct, Clairton, PA 15025",
  "6801 Mckinley Ct 15025, Mon Valley, 15025": "6801 McKinley Ct, Clairton, PA 15025",
  "605 Independence 15025, Mon Valley, 15025": "605 Independence Drive, Clairton, PA 15025",
  "629 Independence Drive 15025, Mon Valley, 15025": "629 Independence Drive, Clairton, PA 15025",
  "608 Independence Drive 15025, Mon Valley, 15025": "608 Independence Drive, Clairton, PA 15025",
  "113 Jefferson Drive 15025, Mon Valley, 15025": "113 Jefferson Drive, Clairton, PA 15025",
  "126 Jefferson Drive 15025, Mon Valley, 15025": "126 Jefferson Drive, Clairton, PA 15025",
  "125 Jefferson Drive, 15025, Mon Valley, 15025": "125 Jefferson Drive, Clairton, PA 15025",
};

async function geocodeAddress(address, mapboxToken) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1&country=us&proximity=-79.88,40.30`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      // Verify it's in Mon Valley
      if (isInMonValley(lat, lng)) {
        return { lat, lng };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function fixAddresses() {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN;
  
  if (!mapboxToken) {
    console.error('❌ MAPBOX_ACCESS_TOKEN not set');
    process.exit(1);
  }

  const fixes = {};
  let fixedCount = 0;
  let failedCount = 0;

  console.log(`Re-geocoding ${problematicAddresses.length} problematic addresses...\n`);

  for (let i = 0; i < problematicAddresses.length; i++) {
    const { address } = problematicAddresses[i];
    const fixedAddress = addressFixes[address] || address;
    
    // Try to improve address format
    let addressToGeocode = fixedAddress;
    if (!addressToGeocode.includes('PA') && !addressToGeocode.includes('Pennsylvania')) {
      // Add PA if missing
      const zipMatch = addressToGeocode.match(/(\d{5})/);
      if (zipMatch) {
        addressToGeocode = addressToGeocode.replace(/(\d{5})/, 'PA $1');
      }
    }
    
    process.stdout.write(`[${i + 1}/${problematicAddresses.length}] ${address.substring(0, 50)}... `);
    
    const coords = await geocodeAddress(addressToGeocode, mapboxToken);
    if (coords) {
      fixes[address] = coords;
      fixedCount++;
      console.log(`✅ Fixed: (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
    } else {
      failedCount++;
      console.log(`❌ Still failed`);
    }
    
    // Rate limit
    if (i < problematicAddresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Fixed: ${fixedCount}/${problematicAddresses.length}`);
  console.log(`❌ Still failed: ${failedCount}/${problematicAddresses.length}\n`);

  // Update coordinates file
  let updatedContent = coordsContent;
  for (const [oldAddress, coords] of Object.entries(fixes)) {
    const oldLine = `  "${oldAddress}": { lat: [0-9.]+, lng: [0-9.-]+ },`;
    const newLine = `  "${oldAddress}": { lat: ${coords.lat}, lng: ${coords.lng} },`;
    updatedContent = updatedContent.replace(
      new RegExp(`  "${oldAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}": { lat: [0-9.]+, lng: [0-9.-]+ },`),
      newLine
    );
  }

  // Write updated file
  fs.writeFileSync(coordsFile, updatedContent, 'utf8');
  console.log(`📝 Updated coordinates file: ${coordsFile}`);
  console.log(`\n💡 Fixed ${fixedCount} addresses. ${failedCount} addresses still need manual review.`);
}

fixAddresses().catch(console.error);

