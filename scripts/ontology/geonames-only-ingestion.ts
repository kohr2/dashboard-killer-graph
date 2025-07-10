import * as fs from 'fs';
import * as path from 'path';
import { GenericIngestionPipeline, IngestionInput } from '@ingestion/pipeline/generic-ingestion-pipeline';
import { logger } from '@shared/utils/logger';
import { geonamesPlugin } from '../../ontologies/geonames/geonames.plugin';

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

/**
 * Load transformed GeoNames data
 */
function loadGeonamesData(): TransformedCity[] {
  const dataPath = path.join(__dirname, '../../ontologies/geonames/data/geonames_cities.json');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`GeoNames data not found at ${dataPath}. Please run the transformation script first.`);
  }

  const data = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(data);
}

/**
 * Convert GeoNames data to generic ingestion format
 */
function convertToGenericFormat(cities: TransformedCity[]): IngestionInput[] {
  return cities.map(city => ({
    id: city.geonameid,
    content: `${city.name} is a city in ${city.countryCode} with population ${city.population}`,
    meta: {
      geonameid: city.geonameid,
      name: city.name,
      asciiname: city.asciiname,
      alternatenames: city.alternatenames,
      latitude: city.latitude,
      longitude: city.longitude,
      featureClass: city.featureClass,
      featureCode: city.featureCode,
      countryCode: city.countryCode,
      admin1Code: city.admin1Code,
      population: city.population,
      timezone: city.timezone,
      modificationDate: city.modificationDate
    }
  }));
}

/**
 * Main ingestion function for GeoNames data
 */
async function ingestGeonamesData(): Promise<void> {
  try {
    logger.info('🚀 Starting GeoNames data ingestion...');

    // Load the transformed data
    logger.info('📖 Loading transformed GeoNames data...');
    const cities = loadGeonamesData();
    logger.info(`📊 Loaded ${cities.length} cities`);

    // Convert to generic format
    logger.info('🔄 Converting to generic ingestion format...');
    const genericData = convertToGenericFormat(cities);

    // For now, we'll use a simplified approach since we need the actual services
    logger.info('📥 Note: This script requires the actual processing and Neo4j services to be configured.');
    logger.info('📊 Would process ${genericData.length} cities');
    
    // Show some sample cities that would be processed
    logger.info('🏆 Sample cities to be processed:');
    const sampleCities = cities.slice(0, 5);
    sampleCities.forEach((city, index) => {
      logger.info(`   ${index + 1}. ${city.name}, ${city.countryCode} (${city.population.toLocaleString()})`);
    });

    logger.info('✅ GeoNames data preparation completed!');
    logger.info('💡 To complete ingestion, configure the processing and Neo4j services.');

  } catch (error: any) {
    logger.error('❌ Error during GeoNames ingestion:', error);
    process.exit(1);
  }
}

// Run the ingestion if this script is executed directly
if (require.main === module) {
  ingestGeonamesData();
}

export { ingestGeonamesData, loadGeonamesData, convertToGenericFormat }; 