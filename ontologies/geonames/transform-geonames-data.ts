import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { IncomingMessage } from 'http';
import AdmZip from 'adm-zip';

interface GeoNamesRecord {
  geonameid: string;
  name: string;
  asciiname: string;
  alternatenames: string;
  latitude: number;
  longitude: number;
  featureClass: string;
  featureCode: string;
  countryCode: string;
  admin1Code: string;
  population: number;
  timezone: string;
  modificationDate: string;
}

interface TransformedCity {
  geonameid: string;
  name: string;
  asciiname: string;
  alternatenames: string;
  latitude: number;
  longitude: number;
  featureClass: string;
  featureCode: string;
  countryCode: string;
  admin1Code: string;
  population: number;
  timezone: string;
  modificationDate: string;
  entityType: 'City';
}

const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities1000.zip';
const OUTPUT_DIR = path.join(__dirname, '../../ontologies/geonames/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'geonames_cities.json');

/**
 * Download and extract GeoNames cities data
 */
async function downloadGeonamesData(): Promise<string> {
  const tempDir = path.join(__dirname, '../cache');
  const zipPath = path.join(tempDir, 'cities1000.zip');
  const txtPath = path.join(tempDir, 'cities1000.txt');

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  console.log('📥 Downloading GeoNames cities data...');
  
  // Download the zip file
  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    https.get(GEONAMES_URL, resolve).on('error', reject);
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to download GeoNames data: ${response.statusCode}`);
  }

  // Write zip file
  const zipStream = fs.createWriteStream(zipPath);
  await new Promise<void>((resolve, reject) => {
    response.pipe(zipStream);
    zipStream.on('finish', resolve);
    zipStream.on('error', reject);
  });

  console.log('📦 Extracting zip file...');
  
  // Extract the zip file using adm-zip
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  
  // Find the cities1000.txt file
  const citiesEntry = zipEntries.find(entry => entry.entryName === 'cities1000.txt');
  if (!citiesEntry) {
    throw new Error('cities1000.txt not found in the ZIP file');
  }
  
  // Extract the file
  const fileContent = citiesEntry.getData().toString('utf8');
  fs.writeFileSync(txtPath, fileContent);

  console.log('✅ GeoNames data downloaded and extracted');
  return txtPath;
}

/**
 * Parse a single line from the GeoNames cities file
 */
function parseGeonamesLine(line: string): GeoNamesRecord | null {
  const fields = line.split('\t');
  
  if (fields.length < 19) {
    return null;
  }

  return {
    geonameid: fields[0],
    name: fields[1],
    asciiname: fields[2],
    alternatenames: fields[3],
    latitude: parseFloat(fields[4]),
    longitude: parseFloat(fields[5]),
    featureClass: fields[6],
    featureCode: fields[7],
    countryCode: fields[8],
    admin1Code: fields[10],
    population: parseInt(fields[14]) || 0,
    timezone: fields[17],
    modificationDate: fields[18]
  };
}

/**
 * Transform GeoNames records to ontology-compatible format
 */
function transformGeonamesData(records: GeoNamesRecord[]): TransformedCity[] {
  console.log(`🔄 Transforming ${records.length} GeoNames records...`);

  return records
    .filter(record => {
      // Filter for populated places (P) with feature codes for cities, towns, villages
      return record.featureClass === 'P' && 
             ['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLF', 'PPLG', 'PPLH', 'PPLL', 'PPLR', 'PPLS', 'PPLW', 'PPLX'].includes(record.featureCode);
    })
    .map(record => ({
      ...record,
      entityType: 'City' as const
    }))
    .sort((a, b) => b.population - a.population); // Sort by population descending
}

/**
 * Main transformation function
 */
async function transformGeonamesDataMain(): Promise<void> {
  try {
    console.log('🚀 Starting GeoNames data transformation...');

    // Download data if not already present
    const txtPath = await downloadGeonamesData();

    // Read and parse the data
    console.log('📖 Reading GeoNames data...');
    const data = fs.readFileSync(txtPath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim());

    console.log(`📊 Found ${lines.length} lines to process`);

    // Parse all records
    const records: GeoNamesRecord[] = [];
    for (const line of lines) {
      const record = parseGeonamesLine(line);
      if (record) {
        records.push(record);
      }
    }

    console.log(`✅ Parsed ${records.length} valid records`);

    // Transform the data
    const transformedData = transformGeonamesData(records);

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write transformed data
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformedData, null, 2));

    console.log(`✅ Transformation complete!`);
    console.log(`📁 Output: ${OUTPUT_FILE}`);
    console.log(`📊 Transformed ${transformedData.length} cities`);
    console.log(`🏆 Top 5 cities by population:`);
    
    transformedData.slice(0, 5).forEach((city, index) => {
      console.log(`   ${index + 1}. ${city.name}, ${city.countryCode} (${city.population.toLocaleString()})`);
    });

  } catch (error) {
    console.error('❌ Error during transformation:', error);
    process.exit(1);
  }
}

// Run the transformation if this script is executed directly
if (require.main === module) {
  transformGeonamesDataMain();
}

export { transformGeonamesDataMain, parseGeonamesLine, transformGeonamesData }; 