#!/usr/bin/env ts-node

import "reflect-metadata";

// Set environment variables for testing
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USERNAME = 'neo4j';
process.env.NEO4J_PASSWORD = 'password';
process.env.NEO4J_DATABASE = 'isco';

import { GenericDatasetIngestionService } from './generic-dataset-ingestion';

async function testIngestion() {
  try {
    console.log('🧪 Testing ISCO dataset ingestion with correct environment variables...');
    console.log('Environment variables:');
    console.log(`  NEO4J_URI: ${process.env.NEO4J_URI}`);
    console.log(`  NEO4J_USERNAME: ${process.env.NEO4J_USERNAME}`);
    console.log(`  NEO4J_PASSWORD: ${process.env.NEO4J_PASSWORD}`);
    console.log(`  NEO4J_DATABASE: ${process.env.NEO4J_DATABASE}`);
    console.log('');

    const service = new GenericDatasetIngestionService('isco');
    await service.ingestDataset({
      ontologyName: 'isco',
      limit: 5,
      dryRun: true // Use dry run to test without database connection
    });

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testIngestion();
} 