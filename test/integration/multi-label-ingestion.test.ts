import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '../../src/platform/database/neo4j-connection';
import { initializeExtensions } from '../../src/register-extensions';
import { FinancialToCrmBridge } from '../../src/ontologies/financial/application/ontology-bridges/financial-to-crm.bridge';
import { v4 as uuidv4 } from 'uuid';

describe('Multi-Label Entity Ingestion via Ontology Bridge', () => {
  let connection: Neo4jConnection;
  let bridge: FinancialToCrmBridge;

  beforeAll(async () => {
    // Initialize all services and dependencies
    initializeExtensions();
    connection = container.resolve(Neo4jConnection);
    bridge = container.resolve(FinancialToCrmBridge);
    await connection.connect();
  });

  afterAll(async () => {
    await connection.close();
  });

  it('should apply both "Investor" and "Organization" labels to an Investor entity', async () => {
    const session = connection.getDriver().session();
    const investorName = `Test Investor ${uuidv4()}`;
    const nodeId = `test-investor-${uuidv4()}`;
    const primaryLabel = 'Investor';

    try {
      // 1. Simulate the core logic: get all labels for a type using the bridge
      const additionalLabels = bridge.mapEntityTypeToCrmLabels(primaryLabel);
      const allLabels = [primaryLabel, ...additionalLabels];
      const labelsCypher = allLabels.map((l: string) => `\`${l}\``).join(':');

      // Expectation for the labels we are testing
      expect(allLabels).toEqual(expect.arrayContaining(['Investor', 'Organization']));

      // 2. Create a test node directly in the database with these labels
      const createQuery = `CREATE (n:${labelsCypher} {id: $nodeId, name: $investorName})`;
      await session.run(createQuery, { nodeId, investorName });

      // 3. Verify that the node was created with the correct labels
      const verifyQuery = `MATCH (n {id: $nodeId}) RETURN labels(n) as labels`;
      const result = await session.run(verifyQuery, { nodeId });
      const dbLabels: string[] = result.records[0]?.get('labels') || [];

      expect(dbLabels).toHaveLength(2);
      expect(dbLabels).toEqual(expect.arrayContaining(['Investor', 'Organization']));

    } finally {
      // 4. Cleanup: ensure the test node is deleted
      await session.run(`MATCH (n {id: $nodeId}) DELETE n`, { nodeId });
      await session.close();
    }
  });
}); 