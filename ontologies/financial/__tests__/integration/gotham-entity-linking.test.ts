import 'reflect-metadata';
import { container } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { FinancialEntityIntegrationService, LlmGraphResponse } from '@generated/financial';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { Transaction } from 'neo4j-driver';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Gotham Entity Linking - Integration Test', () => {
  let financialService: FinancialEntityIntegrationService;
  let neo4jConnection: Neo4jConnection;
  let session: any;

  beforeAll(async () => {
    financialService = container.resolve(FinancialEntityIntegrationService);
    neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
  });

  afterAll(async () => {
    await neo4jConnection.close();
  });

  beforeEach(async () => {
    session = neo4jConnection.getDriver().session();
  });

  afterEach(async () => {
    if (session) {
      await session.close();
    }
  });

  it('should create a WORKS_ON relationship between "Rick" and "Project Gotham"', async () => {
    const emailPath = path.join(process.cwd(), 'test', 'fixtures', 'emails', '17-gotham-diligence-kickoff.eml');
    const emailContent = fs.readFileSync(emailPath, 'utf-8');

    const nlpResponse: LlmGraphResponse = {
      entities: [
        { value: 'Rick', type: 'Person', properties: { email: 'partner.rick@thoma-bravo.com', title: 'Partner' } },
        { value: 'Project Gotham', type: 'Deal', properties: {} },
        { value: 'Thoma Bravo', type: 'Organization', properties: {} },
      ],
      relationships: [{ source: 'Rick', target: 'Thoma Bravo', type: 'WORKS_FOR' }],
      refinement_info: 'Simulated NLP response for test.',
    };
    mockedAxios.post.mockResolvedValue({ data: nlpResponse });

    const { fiboEntities, crmIntegration } = await financialService.processFinancialContent(emailContent);

    for (const entity of fiboEntities as any[]) {
      await session.run(
        `MERGE (n:${entity.type} {id: $id}) SET n += $props`,
        { id: entity.id, props: { ...entity.properties, id: entity.id, name: entity.name } },
      );
    }
    for (const rel of crmIntegration.relationships as any[]) {
      await session.run(
        `MATCH (a {id: $sourceId}), (b {id: $targetId}) MERGE (a)-[r:${rel.type}]->(b)`,
        { sourceId: rel.source, targetId: rel.target },
      );
    }

    const result = await session.run(
      `MATCH (p:Person {name: 'Rick'})-[:WORKS_ON]->(d:Deal {name: 'Project Gotham'}) RETURN p, d`,
    );

    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records[0].get('p').properties.name).toBe('Rick');
    expect(result.records[0].get('d').properties.name).toBe('Project Gotham');
  });
}); 