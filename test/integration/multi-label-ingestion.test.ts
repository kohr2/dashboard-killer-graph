import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { registerAllOntologies } from '../../src/register-ontologies';
import { FinancialToCrmBridge } from '@financial/application/ontology-bridges/financial-to-crm.bridge';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'neo4j-driver';

describe('Multi-Label Entity Ingestion via Ontology Bridge', () => {
  let connection: Neo4jConnection;
  let bridge: FinancialToCrmBridge;
  let transaction: Transaction;

  beforeAll(async () => {
    // Initialize all services and dependencies
    registerAllOntologies();
    connection = container.resolve(Neo4jConnection);
    bridge = container.resolve(FinancialToCrmBridge);
    await connection.connect();
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    const session = connection.getDriver().session();
    transaction = session.beginTransaction();
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
      await transaction.close();
    }
  });

  it('should apply both "Investor" and "Organization" labels to an Investor entity', async () => {
    const investorName = `Test Investor ${uuidv4()}`;
    const nodeId = `test-investor-${uuidv4()}`;
    const primaryLabel = 'Investor';

    // 1. Simulate the core logic: get all labels for a type using the bridge
    const additionalLabels = bridge.getCrmLabelsForFinancialType(primaryLabel);
    const allLabels = [primaryLabel, ...additionalLabels];
    const labelsCypher = allLabels.map((l: string) => `\`${l}\``).join(':');

    // Expectation for the labels we are testing
    expect(allLabels).toEqual(expect.arrayContaining(['Investor', 'Organization']));

    // 2. Create a test node directly in the transaction with these labels
    const createQuery = `CREATE (n:${labelsCypher} {id: $nodeId, name: $investorName})`;
    await transaction.run(createQuery, { nodeId, investorName });

    // 3. Verify that the node was created with the correct labels within the transaction
    const verifyQuery = `MATCH (n {id: $nodeId}) RETURN labels(n) as labels`;
    const result = await transaction.run(verifyQuery, { nodeId });
    const dbLabels: string[] = result.records[0]?.get('labels') || [];

    expect(dbLabels).toHaveLength(3);
    expect(dbLabels).toEqual(expect.arrayContaining(['Investor', 'Organization', 'FinancialActor']));
  });
}); 