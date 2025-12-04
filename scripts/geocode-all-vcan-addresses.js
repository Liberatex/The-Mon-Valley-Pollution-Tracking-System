/**
 * Script to geocode ALL VCAN addresses and generate hardcoded coordinates
 * Run this ONCE to populate vcanDistributionCoordinates.ts with exact coordinates
 * 
 * Usage: 
 *   export MAPBOX_ACCESS_TOKEN="your_token"
 *   node scripts/geocode-all-vcan-addresses.js
 */

const fs = require('fs');
const path = require('path');

// Import address arrays (simplified - you'll need to copy the full arrays from the service file)
const AIR_FILTER_ADDRESSES = require('../frontend/src/services/vcanDistributionService.ts').AIR_FILTER_ADDRESSES || [];
const AIR_PURIFIER_ADDRESSES = require('../frontend/src/services/vcanDistributionService.ts').AIR_PURIFIER_ADDRESSES || [];

// Since we can't easily import TypeScript, let's read the file directly
function parseAddressesFromFile() {
  const serviceFile = path.join(__dirname, '../frontend/src/services/vcanDistributionService.ts');
  const content = fs.readFileSync(serviceFile, 'utf8');
  
  // Extract AIR_FILTER_ADDRESSES array
  const filterMatch = content.match(/const AIR_FILTER_ADDRESSES: string\[\] = \[([\s\S]*?)\];/);
  const filterAddresses = filterMatch 
    ? filterMatch[1].split('\n').map(line => {
        const match = line.match(/'([^']+)'/);
        return match ? match[1] : null;
      }).filter(Boolean)
    : [];
  
  // Extract AIR_PURIFIER_ADDRESSES array  
  const purifierMatch = content.match(/const AIR_PURIFIER_ADDRESSES: string\[\] = \[([\s\S]*?)\];/);
  const purifierAddresses = purifierMatch
    ? purifierMatch[1].split('\n').map(line => {
        const match = line.match(/'([^']+)'/);
        return match ? match[1] : null;
      }).filter(Boolean)
    : [];
  
  return { filterAddresses, purifierAddresses };
}

function parseAddress(addressStr) {
  const cleaned = addressStr.trim();
  const zipMatch = cleaned.match(/(\d{5})/);
  const zipCode = zipMatch ? zipMatch[1] : '';
  
  let city = '';
  if (cleaned.includes('Clairton')) {
    city = 'Clairton';
  } else if (cleaned.includes('McKeesport') || cleaned.match(/15(132|133)/)) {
    city = 'McKeesport';
  } else if (cleaned.includes('Monongahela') || cleaned.match(/15045/)) {
    city = 'Monongahela';
  } else {
    city = 'Mon Valley';
  }
  
  const street = cleaned.replace(/\s*(Clairton|McKeesport|Monongahela|Mon Valley).*/, '').trim();
  
  return { street, city, zipCode };
}

async function geocodeAddress(address, city, zipCode, mapboxToken) {
  const fullAddress = `${address}, ${city}, PA ${zipCode}, USA`;
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1&country=us&proximity=-79.88,40.30`
    );

    if (!response.ok) {
      console.warn(`  ⚠️ Geocoding failed: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function geocodeAll() {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN;
  
  if (!mapboxToken) {
    console.error('❌ MAPBOX_ACCESS_TOKEN environment variable not set');
    console.error('   Set it with: export MAPBOX_ACCESS_TOKEN="your_token"');
    process.exit(1);
  }

  const { filterAddresses, purifierAddresses } = parseAddressesFromFile();
  console.log(`📋 Found ${filterAddresses.length} filter addresses and ${purifierAddresses.length} purifier addresses\n`);

  const filterCoords = {};
  const purifierCoords = {};

  // Geocode air filter addresses
  console.log('🔍 Geocoding air filter addresses...\n');
  for (let i = 0; i < filterAddresses.length; i++) {
    const addressStr = filterAddresses[i];
    const parsed = parseAddress(addressStr);
    const addressKey = `${parsed.street || addressStr}, ${parsed.city}, ${parsed.zipCode}`;
    
    process.stdout.write(`[${i + 1}/${filterAddresses.length}] ${addressKey}... `);
    
    const coords = await geocodeAddress(parsed.street || addressStr, parsed.city, parsed.zipCode, mapboxToken);
    if (coords) {
      filterCoords[addressKey] = coords;
      console.log(`✅ (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
    } else {
      console.log(`❌ Failed`);
    }
    
    // Rate limit: 100ms delay (600 requests/minute max)
    if (i < filterAddresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Geocode air purifier addresses
  console.log(`\n🔍 Geocoding air purifier addresses...\n`);
  for (let i = 0; i < purifierAddresses.length; i++) {
    const addressStr = purifierAddresses[i];
    const parsed = parseAddress(addressStr);
    const addressKey = `${parsed.street || addressStr}, ${parsed.city}, ${parsed.zipCode}`;
    
    process.stdout.write(`[${i + 1}/${purifierAddresses.length}] ${addressKey}... `);
    
    const coords = await geocodeAddress(parsed.street || addressStr, parsed.city, parsed.zipCode, mapboxToken);
    if (coords) {
      purifierCoords[addressKey] = coords;
      console.log(`✅ (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
    } else {
      console.log(`❌ Failed`);
    }
    
    // Rate limit: 100ms delay
    if (i < purifierAddresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Generate TypeScript code
  const filterEntries = Object.entries(filterCoords)
    .map(([key, value]) => `  "${key}": { lat: ${value.lat}, lng: ${value.lng} },`)
    .join('\n');

  const purifierEntries = Object.entries(purifierCoords)
    .map(([key, value]) => `  "${key}": { lat: ${value.lat}, lng: ${value.lng} },`)
    .join('\n');

  const output = `/**
 * Hardcoded geocoded coordinates for VCAN distribution addresses
 * Generated by scripts/geocode-all-vcan-addresses.js
 * DO NOT EDIT MANUALLY - Regenerate using the script if addresses change
 * 
 * Generated: ${new Date().toISOString()}
 * Air Filters: ${Object.keys(filterCoords).length}/${filterAddresses.length}
 * Air Purifiers: ${Object.keys(purifierCoords).length}/${purifierAddresses.length}
 */

export interface AddressCoordinates {
  [addressKey: string]: { lat: number; lng: number };
}

export const AIR_FILTER_COORDINATES: AddressCoordinates = {
${filterEntries}
};

export const AIR_PURIFIER_COORDINATES: AddressCoordinates = {
${purifierEntries}
};
`;

  // Write to file
  const outputPath = path.join(__dirname, '../frontend/src/services/vcanDistributionCoordinates.ts');
  fs.writeFileSync(outputPath, output, 'utf8');
  
  console.log(`\n✅ Geocoding complete!`);
  console.log(`   Air Filters: ${Object.keys(filterCoords).length}/${filterAddresses.length} geocoded`);
  console.log(`   Air Purifiers: ${Object.keys(purifierCoords).length}/${purifierAddresses.length} geocoded`);
  console.log(`\n📝 Coordinates written to: ${outputPath}`);
  console.log(`\n💡 The map will now show exact addresses instead of approximate zip code locations!`);
}

geocodeAll().catch(console.error);

