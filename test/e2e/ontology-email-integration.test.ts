import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyEmailIngestionService } from '@platform/processing/ontology-email-ingestion.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@common/utils/logger';

// Test configuration
const testDatabaseName = 'test-ontology-integration';

describe('Ontology Email Integration E2E', () => {
  let ontologyEmailIngestionService: OntologyEmailIngestionService;
  let neo4jConnection: Neo4jConnection;

  beforeAll(async () => {
    // Set test database environment variable
    process.env.NEO4J_DATABASE = testDatabaseName;
    
    // Clear the test database to ensure clean state
    neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    await neo4jConnection.clearDatabase();
    await neo4jConnection.close();
    
    // Initialize services
    ontologyEmailIngestionService = new OntologyEmailIngestionService();
  });

  afterAll(async () => {
    // Clean up test database
    if (neo4jConnection) {
      await neo4jConnection.connect();
      await neo4jConnection.clearDatabase();
      await neo4jConnection.close();
    }
  });

  it('should process FIBO ontology emails end-to-end', async () => {
    logger.info('🧪 Starting FIBO ontology email integration test');
    
    try {
      // Use the service to ingest ontology email
      await ontologyEmailIngestionService.ingestOntologyEmail('fibo');
      
      // Verify results in database
      await verifyIngestionResults('fibo');
      
      logger.info('✅ FIBO ontology email integration test completed successfully');
    } catch (error) {
      logger.error('❌ FIBO ontology email integration test failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout

  it('should process procurement ontology emails end-to-end', async () => {
    logger.info('🧪 Starting procurement ontology email integration test');
    
    try {
      // Use the service to ingest ontology email
      await ontologyEmailIngestionService.ingestOntologyEmail('procurement');
      
      // Verify results in database
      await verifyIngestionResults('procurement');
      
      logger.info('✅ Procurement ontology email integration test completed successfully');
    } catch (error) {
      logger.error('❌ Procurement ontology email integration test failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout
});

/**
 * Verify entities and relationships in Neo4j
 */
async function verifyIngestionResults(ontologyName: string): Promise<void> {
  logger.info(`🔄 Verifying ingestion results for ${ontologyName}`);
  
  try {
    const neo4jConnection = container.resolve(Neo4jConnection);
    const session = neo4jConnection.getSession();
    
    if (!session) {
      throw new Error('No Neo4j session available for verification');
    }

    // Query all entities
    const entitiesResult = await session.run('MATCH (n) RETURN n.name as name, n.id as id, n.createdAt as createdAt LIMIT 10');
    const entities = entitiesResult.records.map(record => ({
      name: record.get('name'),
      id: record.get('id'),
      createdAt: record.get('createdAt')
    }));

    // Query all relationships
    const relationshipsResult = await session.run('MATCH ()-[r]->() RETURN type(r) as type, count(r) as count');
    const relationships = relationshipsResult.records.map(record => ({
      type: record.get('type'),
      count: record.get('count')
    }));

    logger.info(`📊 Database verification results:`);
    logger.info(`   - Total entities found: ${entities.length}`);
    logger.info(`   - Total relationship types: ${relationships.length}`);
    
    if (entities.length > 0) {
      logger.info(`   - Sample entities: ${entities.slice(0, 3).map(e => `${e.name} (${e.id})`).join(', ')}`);
    }
    
    if (relationships.length > 0) {
      logger.info(`   - Relationship types: ${relationships.map(r => `${r.type}: ${r.count}`).join(', ')}`);
    }

    // Basic verification - ensure we have some data
    if (entities.length === 0 && relationships.length === 0) {
      throw new Error('No entities or relationships found in database after ingestion');
    }

    logger.info(`✅ Verification completed for ${ontologyName}`);
  } catch (error) {
    logger.error(`❌ Verification failed for ${ontologyName}:`, error);
    throw error;
  }
} 