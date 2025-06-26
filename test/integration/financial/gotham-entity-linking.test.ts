import 'reflect-metadata';
import { container } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { FinancialEntityIntegrationService } from '../../../src/ontologies/financial/application/services/financial-entity-integration.service';
import { Neo4jConnection } from '../../../src/platform/database/neo4j-connection';
import { LlmGraphResponse } from '../../../src/ontologies/financial/application/services/financial-entity-integration.service';

// Mock the axios call to the Python NLP service
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Gotham Entity Linking - Integration Test', () => {
    let financialService: FinancialEntityIntegrationService;
    let neo4jConnection: Neo4jConnection;

    beforeAll(async () => {
        // Initialize services from the container
        financialService = container.resolve(FinancialEntityIntegrationService);
        neo4jConnection = container.resolve(Neo4jConnection);
        await neo4jConnection.connect();
    });

    afterAll(async () => {
        await neo4jConnection.close();
    });

    beforeEach(async () => {
        // Clear the database before each test
        const session = neo4jConnection.getDriver().session();
        try {
            await session.run('MATCH (n) DETACH DELETE n');
        } finally {
            await session.close();
        }
    });

    it('should create a WORKS_ON relationship between "Rick" and "Project Gotham"', async () => {
        // 1. Setup: Read the email content
        const emailPath = path.join(__dirname, '../../../test-emails/17-gotham-diligence-kickoff.eml');
        const emailContent = fs.readFileSync(emailPath, 'utf-8');

        // 2. Mock NLP Response: Simulate the NLP service finding the entities but not the relationship
        const nlpResponse: LlmGraphResponse = {
            entities: [
                { value: 'Rick', type: 'Person', properties: { email: 'partner.rick@thoma-bravo.com', title: 'Partner' } },
                { value: 'Project Gotham', type: 'Deal', properties: {} },
                { value: 'Thoma Bravo', type: 'Organization', properties: {} }
            ],
            relationships: [
                // The key here is that the WORKS_ON relationship is MISSING from the NLP output
                { source: 'Rick', target: 'Thoma Bravo', type: 'WORKS_FOR' }
            ],
            refinement_info: 'Simulated NLP response for test.'
        };
        mockedAxios.post.mockResolvedValue({ data: nlpResponse });

        // 3. Execution: Process the email content
        const { fiboEntities, crmIntegration } = await financialService.processFinancialContent(emailContent);

        // 4. Persist to DB: Simulate the ingestion process
        const session = neo4jConnection.getDriver().session();
        try {
            for (const entity of fiboEntities) {
                await session.run(
                    `MERGE (n:${entity.type} {name: $name}) SET n += $props`,
                    { name: entity.name, props: { ...entity.properties, id: entity.id, name: entity.name } }
                );
            }
            for (const rel of crmIntegration.relationships) {
                await session.run(
                    `
                    MATCH (a {id: $sourceId}), (b {id: $targetId})
                    MERGE (a)-[r:${rel.type}]->(b)
                    `,
                    { sourceId: rel.source, targetId: rel.target }
                );
            }
        } finally {
            await session.close();
        }

        // 5. Assertion: Verify the relationship exists in the database
        const verificationSession = neo4jConnection.getDriver().session();
        try {
            const query = `
                MATCH (p:Person {name: 'Rick'})-[:WORKS_ON]->(d:Deal {name: 'Project Gotham'})
                RETURN p, d
            `;
            const result = await verificationSession.run(query);
            expect(result.records.length).toBeGreaterThan(0);
            expect(result.records[0].get('p').properties.name).toBe('Rick');
            expect(result.records[0].get('d').properties.name).toBe('Project Gotham');
        } finally {
            await verificationSession.close();
        }
    });
}); 