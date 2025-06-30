import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { registerAllOntologies } from '@src/register-ontologies';
import { FinancialToCrmBridge } from '@financial/application/ontology-bridges/financial-to-crm.bridge';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'neo4j-driver';

/*
 * Relocated from test/integration/multi-label-ingestion.test.ts
 * Ensures that an Investor node receives the expected multiple labels
 */

describe('Multi-Label Entity Ingestion via Ontology Bridge', () => {
  let connection: Neo4jConnection;
  let bridge: FinancialToCrmBridge;
  let transaction: Transaction;

  beforeAll(async () => {
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

    const additionalLabels = bridge.getCrmLabelsForFinancialType(primaryLabel);
    const allLabels = [primaryLabel, ...additionalLabels];
    const labelsCypher = allLabels.map((l: string) => `\`${l}\``).join(':');

    expect(allLabels).toEqual(expect.arrayContaining(['Investor', 'Organization']));

    await transaction.run(`CREATE (n:${labelsCypher} {id: $nodeId, name: $investorName})`, {
      nodeId,
      investorName,
    });

    const result = await transaction.run(`MATCH (n {id: $nodeId}) RETURN labels(n) as labels`, { nodeId });
    const dbLabels: string[] = result.records[0]?.get('labels') || [];

    expect(dbLabels).toHaveLength(3);
    expect(dbLabels).toEqual(expect.arrayContaining(['Investor', 'Organization', 'FinancialActor']));
  });
}); 