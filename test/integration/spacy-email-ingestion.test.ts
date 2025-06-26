import { container } from 'tsyringe';
import { Neo4jConnection } from '../../src/platform/database/neo4j-connection';
import { demonstrateSpacyEmailIngestionPipeline } from '../../scripts/demo-email-ingestion-spacy';
import { resetDatabase } from '../../scripts/reset-neo4j';
import axios from 'axios';
import * as fs from 'fs';
import { join, resolve } from 'path';
import { FinancialEntityIntegrationService } from '../../src/ontologies/financial/application/services/financial-entity-integration.service';

// Mock the axios module for ontology sync
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the financial service
jest.mock('../../src/ontologies/financial/application/services/financial-entity-integration.service');

// Increase timeout for integration tests
jest.setTimeout(60000); // 60 seconds

describe('SpacyEmailIngestionPipeline - Integration Test', () => {
  let connection: Neo4jConnection;

  beforeAll(async () => {
    // This assumes the test database is running and configured in Neo4jConnection
    connection = container.resolve(Neo4jConnection);
    await connection.connect();

    // Mock the NLP service responses
    // 1. Ontology sync
    mockedAxios.post.mockResolvedValue({ data: { success: true }, status: 200 });
    
    // 2. Mock FinancialEntityIntegrationService implementation
    FinancialEntityIntegrationService.prototype.processFinancialContent = jest.fn().mockResolvedValue({
        fiboEntities: [
            { id: 'ent-1', name: 'Alice', type: 'Person', embedding: Array(384).fill(0.1) },
            { id: 'ent-2', name: 'Wayne Enterprises', type: 'Organization', embedding: Array(384).fill(0.2) },
            { id: 'ent-3', name: 'Gotham', type: 'Location', embedding: Array(384).fill(0.3) }
        ],
        crmIntegration: {
            relationships: [
                { source: 'ent-1', type: 'WORKS_AT', target: 'ent-2' },
                { source: 'ent-2', type: 'LOCATED_IN', target: 'ent-3' }
            ]
        }
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    // Reset the database before each test
    await resetDatabase();
  });

  it('should process an email, create nodes and relationships in Neo4j', async () => {
    // We only need one email for this test.
    // To ensure the test is deterministic, let's create a temporary test email file.
    const tempTestDir = join(process.cwd(), 'test-emails-temp');
    if (!fs.existsSync(tempTestDir)) {
      fs.mkdirSync(tempTestDir);
    }
    const emailFilePath = join(tempTestDir, 'integration-test.eml');
    const emailContent = `From: "Alice" <alice@example.com>
To: "Bob" <bob@corp.com>
Subject: Project Discussion

Hi team, let's discuss the project based in Gotham with Wayne Enterprises.`;
    fs.writeFileSync(emailFilePath, emailContent);
    
    // Temporarily replace the 'test-emails' directory with our temp directory in the script
    // This is a bit of a hack. A better way would be to make the directory a parameter.
    // For now, we can spy on `fs.readdir` and `path.join`.
    const readdirSpy = jest.spyOn(require('fs/promises'), 'readdir');
    readdirSpy.mockResolvedValue(['integration-test.eml'] as any);
    
    const joinSpy = jest.spyOn(require('path'), 'join');
    joinSpy.mockImplementation((...args) => {
        if (args[1] === 'test-emails') {
            return join(tempTestDir, args[2] as string);
        }
        return join(...args.map(String));
    });


    // Run the pipeline
    await demonstrateSpacyEmailIngestionPipeline();

    // --- VERIFICATION ---
    const session = connection.getDriver().session();
    try {
      // 1. Check for Communication node
      const commResult = await session.run(
        'MATCH (c:Communication) WHERE c.subject = "Project Discussion" RETURN c'
      );
      expect(commResult.records).toHaveLength(1);
      const communicationNode = commResult.records[0].get('c').properties;
      expect(communicationNode.from).toBe('Alice <alice@example.com>');

      // 2. Check for Entity nodes (Person, Organization, Location)
      const personResult = await session.run('MATCH (p:Person {name: "Alice"}) RETURN p');
      expect(personResult.records).toHaveLength(1);
      
      const orgResult = await session.run('MATCH (o:Organization {name: "Wayne Enterprises"}) RETURN o');
      expect(orgResult.records).toHaveLength(1);
      
      const locResult = await session.run('MATCH (l:Location {name: "Gotham"}) RETURN l');
      expect(locResult.records).toHaveLength(1);

      // 3. Check for relationships between entities
      const workRelResult = await session.run('MATCH (:Person {name:"Alice"})-[:WORKS_AT]->(:Organization {name:"Wayne Enterprises"}) RETURN count(*) as count');
      expect(workRelResult.records[0].get('count').low).toBe(1);

      const locRelResult = await session.run('MATCH (:Organization {name:"Wayne Enterprises"})-[:LOCATED_IN]->(:Location {name:"Gotham"}) RETURN count(*) as count');
      expect(locRelResult.records[0].get('count').low).toBe(1);

      // 4. Check for links from Communication to entities
       const containsRelResult = await session.run(
        `MATCH (:Communication {subject: "Project Discussion"})-[:CONTAINS_ENTITY]->(e)
         RETURN count(e) as count`
      );
      expect(containsRelResult.records[0].get('count').low).toBe(3);


    } finally {
      await session.close();
      // Cleanup spy
      readdirSpy.mockRestore();
      joinSpy.mockRestore();
      // Remove temp directory
      fs.unlinkSync(emailFilePath);
      fs.rmdirSync(tempTestDir);
    }
  });
}); 