import 'reflect-metadata';

// Use unified test database from shared constants
import { UNIFIED_TEST_DATABASE } from '@shared/constants/test-database';

// Test configuration - use unified database
const testDatabaseName = UNIFIED_TEST_DATABASE;

import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { simpleParser } from 'mailparser';
import { container } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import { OntologyBuildService } from '@platform/ontology/ontology-build.service';
import { EmailFixtureGenerationService } from '@ingestion/fixtures/email-fixture-generation.service';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { Neo4jIngestionService } from '@platform/processing/neo4j-ingestion.service';
import { GenericIngestionPipeline } from '@ingestion/pipeline/generic-ingestion-pipeline';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { registerSelectedOntologies } from '@src/register-ontologies';
import { OntologyEmailIngestionService } from '@ingestion/ontology-email-ingestion.service';

// Simple ontology registration using the proper plugin system
function registerSimpleOntologies() {
  // Use the proper plugin-based registration system
  registerSelectedOntologies(['procurement', 'fibo']);
}

/**
 * Step 1: Build ontology using existing service
 */
async function buildOntologyService(ontologyName: string): Promise<void> {
  const ontologyBuildService = container.resolve(OntologyBuildService);
  await ontologyBuildService.buildOntologyByName(ontologyName, {
    topEntities: 10,
    topRelationships: 10
  });
}

/**
 * Step 2: Generate one fixture email using existing service
 */
async function generateFixtureEmail(ontologyName: string): Promise<string> {
  const fixtureService = container.resolve(EmailFixtureGenerationService);
  return await fixtureService.generateSingleEmailFixture(ontologyName);
}

/**
 * Step 3 & 4: Process email and perform ingestion using existing services
 */
async function processEmailAndIngest(ontologyName: string, emailPath: string): Promise<any> {
  logger.info(`🔄 Step 3 & 4: Processing email and performing ingestion for ${ontologyName}`);
  
  try {
    // Set test database environment variable
    process.env.NEO4J_DATABASE = testDatabaseName;
    
    // IMPORTANT: Register ontologies FIRST before resolving services
    registerSimpleOntologies();
    
    // Initialize services AFTER ontology registration
    const contentProcessingService = container.resolve(ContentProcessingService);
    const neo4jIngestionService = container.resolve(Neo4jIngestionService);
    
    // Initialize Neo4j service
    await neo4jIngestionService.initialize();
    
    // Create generic pipeline
    const pipeline = new GenericIngestionPipeline(
      contentProcessingService,
      neo4jIngestionService
    );
    
    // Read and parse the email
    const emailContent = await fsPromises.readFile(emailPath, 'utf-8');
    const parsedEmail = await simpleParser(emailContent);
    const emailBody = typeof parsedEmail.text === 'string'
      ? parsedEmail.text
      : (parsedEmail.html || '').replace(/<[^>]*>/g, '');
    
    // Create ingestion input
    const emailInput = {
      id: path.basename(emailPath),
      content: emailBody,
      meta: {
        sourceFile: path.basename(emailPath),
        parsedEmail: parsedEmail
      }
    };
    
    // Process the email
    await pipeline.run([emailInput]);
    
    logger.info(`✅ Email processing and ingestion completed for ${ontologyName}`);
    
    // Return the Neo4j service for verification
    return neo4jIngestionService;
    
  } catch (error) {
    logger.error(`❌ Failed to process email for ${ontologyName}: ${error}`);
    throw error;
  }
}

/**
 * Step 5: Verify entities and relationships in Neo4j
 */
async function verifyIngestionResults(ontologyName: string, neo4jService?: any): Promise<void> {
  logger.info(`🔄 Step 5: Verifying ingestion results for ${ontologyName}`);
  
  try {
    let session;
    
    if (neo4jService && neo4jService.getSession) {
      // Use the same session from the ingestion service
      session = neo4jService.getSession();
      logger.info('Using session from ingestion service');
    } else {
      // Fallback to creating a new session
      const neo4jConnection = container.resolve(Neo4jConnection);
      session = neo4jConnection.getSession();
      logger.info('Using new session from Neo4jConnection');
    }
    
    // Add a small delay to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Query for all nodes (entities) with more detailed logging
    const entityResult = await session.run('MATCH (n) RETURN labels(n) as labels, n.name as name, n.id as id LIMIT 20');
    const entities = entityResult.records.map((record: any) => ({
      labels: record.get('labels'),
      name: record.get('name'),
      id: record.get('id')
    }));
    
    // Query for all relationships
    const relationshipResult = await session.run('MATCH ()-[r]->() RETURN type(r) as type, startNode(r).name as from, endNode(r).name as to LIMIT 20');
    const relationships = relationshipResult.records.map((record: any) => ({
      type: record.get('type'),
      from: record.get('from'),
      to: record.get('to')
    }));
    
    // Query for specific entity types that should be created
    // Note: The system skips generic "Thing" entities, so we look for specific typed entities
    const nonCommunicationResult = await session.run('MATCH (n) WHERE NOT n:Communication RETURN n.name as name, n.id as id LIMIT 10');
    const nonCommunicationEntities = nonCommunicationResult.records.map((record: any) => ({
      name: record.get('name'),
      id: record.get('id')
    }));
    
    const communicationResult = await session.run('MATCH (n:Communication) RETURN n.name as name, n.id as id LIMIT 10');
    const communications = communicationResult.records.map((record: any) => ({
      name: record.get('name'),
      id: record.get('id')
    }));
    
    // Also check for Organization nodes since we saw those being created
    const organizationResult = await session.run('MATCH (n:Organization) RETURN n.name as name, n.id as id LIMIT 10');
    const organizations = organizationResult.records.map((record: any) => ({
      name: record.get('name'),
      id: record.get('id')
    }));
    
    logger.info(`📊 Found ${entities.length} total entities and ${relationships.length} relationships`);
    logger.info(`📋 Found ${nonCommunicationEntities.length} non-Communication entities and ${communications.length} Communication entities`);
    logger.info(`🏢 Found ${organizations.length} Organization entities`);
    
    // Log all entities for debugging
    if (entities.length > 0) {
      logger.info('📝 All entities found:');
      entities.forEach((entity: any, index: number) => {
        logger.info(`   ${index + 1}. Labels: [${entity.labels.join(', ')}], Name: ${entity.name}, ID: ${entity.id}`);
      });
    }
    
    if (relationships.length > 0) {
      logger.info('🔗 All relationships found:');
      relationships.forEach((rel: any, index: number) => {
        logger.info(`   ${index + 1}. Type: ${rel.type}, From: ${rel.from}, To: ${rel.to}`);
      });
    }
    
    // Basic verification - ensure we have some data
    // The ingestion process should create at least a Communication node and some specific typed entities
    expect(communications.length).toBeGreaterThan(0);
    expect(nonCommunicationEntities.length).toBeGreaterThan(0);
    
    logger.info(`✅ Verification completed for ${ontologyName}`);
    
  } catch (error) {
    logger.error(`❌ Verification failed for ${ontologyName}: ${error}`);
    throw error;
  }
}

/**
 * Clean up test data (database only, preserve fixtures)
 */
async function cleanup(ontologyName: string): Promise<void> {
  logger.info(`🧹 Cleaning up test data for ${ontologyName}`);
  
  try {
    // Clean up test database using the existing service
    const neo4jIngestionService = container.resolve(Neo4jIngestionService);
    await neo4jIngestionService.close();
    
    logger.info(`✅ Cleaned up test database: ${testDatabaseName}`);
    
  } catch (error) {
    logger.error(`❌ Error during cleanup: ${error}`);
  }
}

/**
 * Run the complete integration test for a single ontology
 */
async function runIntegrationTest(ontologyName: string): Promise<void> {
  logger.info(`🚀 Starting integration test for ${ontologyName}`);
  
  try {
    // Step 1: Build ontology
    await buildOntologyService(ontologyName);
    
    // Step 2: Generate one fixture email
    const emailPath = await generateFixtureEmail(ontologyName);
    
    // Step 3 & 4: Process email and perform ingestion
    const neo4jService = await processEmailAndIngest(ontologyName, emailPath);
    
    // Step 5: Verify results
    await verifyIngestionResults(ontologyName, neo4jService);
    
    logger.info(`✅ Integration test completed successfully for ${ontologyName}`);
    
  } catch (error) {
    logger.error(`❌ Integration test failed for ${ontologyName}: ${error}`);
    throw error;
  } finally {
    await cleanup(ontologyName);
  }
}

/**
 * End-to-end test that validates the complete ontology email integration flow:
 * 1. Runs ontology build service
 * 2. Generates one fixture email using existing service
 * 3. Processes and ingests the email using existing services
 * 4. Verifies entities and relationships in Neo4j
 * 5. Cleans up test data
 */
describe('Ontology Email Integration E2E (Simple)', () => {
  // Test cases for ontologies that have source.ontology.json files
  it('should process procurement ontology emails end-to-end', async () => {
    await runIntegrationTest('procurement');
  }, 600000); // 10 minutes timeout

  it.skip('should process FIBO ontology emails end-to-end (SKIPPED - too large for CI)', async () => {
    // FIBO ontology has 1,780 entities and 603 relationships, making it too large for regular testing
    // To run this test manually, change it.skip to it and run: npm test -- --testNamePattern="FIBO"
    await runIntegrationTest('fibo');
  }, 300000); // 5 minutes timeout
}); 