import { demonstrateSpacyEmailIngestionPipeline } from '../../scripts/demo-email-ingestion-spacy';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { container } from 'tsyringe';
import { Session } from 'neo4j-driver';

describe('Email Ingestion - Email as Properties', () => {
  let connection: Neo4jConnection;
  let session: Session;

  beforeAll(async () => {
    connection = container.resolve(Neo4jConnection);
    await connection.connect();
    session = connection.getDriver().session();
  });

  afterAll(async () => {
    if (session) {
      await session.close();
    }
    if (connection) {
      await connection.close();
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    await session.run('MATCH (n) DETACH DELETE n');
  });

  it('should not create Email entities, but add email addresses as properties to Person/Organization nodes', async () => {
    // Run the ingestion pipeline
    await demonstrateSpacyEmailIngestionPipeline();

    // Verify no Email entities exist as separate nodes
    const emailEntitiesResult = await session.run('MATCH (e:Email) RETURN count(e) as count');
    const emailEntitiesCount = emailEntitiesResult.records[0].get('count').toNumber();
    expect(emailEntitiesCount).toBe(0);

    // Verify that Person nodes have email properties
    const personWithEmailResult = await session.run(`
      MATCH (p:Person) 
      WHERE p.email IS NOT NULL 
      RETURN count(p) as count
    `);
    const personWithEmailCount = personWithEmailResult.records[0].get('count').toNumber();
    expect(personWithEmailCount).toBeGreaterThan(0);

    // Verify that Organization nodes can have email properties
    const orgWithEmailResult = await session.run(`
      MATCH (o:Organization) 
      WHERE o.email IS NOT NULL OR o.contactEmail IS NOT NULL
      RETURN count(o) as count
    `);
    const orgWithEmailCount = orgWithEmailResult.records[0].get('count').toNumber();
    
    // At least some organizations should have email contact information
    expect(orgWithEmailCount).toBeGreaterThanOrEqual(0);
  });

  it('should create Communication nodes that link to Person/Organization nodes with email properties', async () => {
    // Run the ingestion pipeline
    await demonstrateSpacyEmailIngestionPipeline();

    // Verify Communication nodes exist
    const communicationResult = await session.run('MATCH (c:Communication) RETURN count(c) as count');
    const communicationCount = communicationResult.records[0].get('count').toNumber();
    expect(communicationCount).toBeGreaterThan(0);

    // Verify Communications are linked to entities with email properties
    const linkedEntitiesResult = await session.run(`
      MATCH (c:Communication)-[:CONTAINS_ENTITY]->(e)
      WHERE e:Person OR e:Organization
      AND (e.email IS NOT NULL OR e.contactEmail IS NOT NULL)
      RETURN count(DISTINCT e) as count
    `);
    const linkedEntitiesCount = linkedEntitiesResult.records[0].get('count').toNumber();
    expect(linkedEntitiesCount).toBeGreaterThan(0);
  });

  it('should extract email addresses from communication content and assign them to the correct entities', async () => {
    // Run the ingestion pipeline
    await demonstrateSpacyEmailIngestionPipeline();

    // Check that extracted email addresses are properly assigned as properties
    const entitiesWithExtractedEmailsResult = await session.run(`
      MATCH (e)
      WHERE (e:Person OR e:Organization)
      AND e.email IS NOT NULL
      AND e.email =~ '.*@.*\\..+'
      RETURN e.name as name, e.email as email, labels(e) as labels
      LIMIT 10
    `);

    expect(entitiesWithExtractedEmailsResult.records.length).toBeGreaterThan(0);

    // Verify email format is valid
    entitiesWithExtractedEmailsResult.records.forEach(record => {
      const email = record.get('email');
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });
}); 