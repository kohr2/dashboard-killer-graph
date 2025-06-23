import { Neo4jConnection } from '@/graph/neo4j-connection';
import { Driver } from 'neo4j-driver';

describe('Neo4j Connection', () => {
  let connection: Neo4jConnection;
  
  beforeAll(async () => {
    connection = new Neo4jConnection({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password'
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('Connection Management', () => {
    it('should connect to Neo4j instance', async () => {
      const result = await connection.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.version).toBeDefined();
      expect(result.database).toBe('neo4j');
    });

    it('should handle connection errors gracefully', async () => {
      const badConnection = new Neo4jConnection({
        uri: 'bolt://invalid:7687',
        username: 'wrong',
        password: 'wrong'
      });

      await expect(badConnection.testConnection()).rejects.toThrow();
    });
  });

  describe('Node Operations', () => {
    it('should create and retrieve a Deal node', async () => {
      const dealData = {
        name: 'Project Gotham',
        stage: 'LOI',
        value: 50000000,
        probability: 0.75
      };

      const node = await connection.createNode('Deal', dealData);
      
      expect(node).toBeDefined();
      expect(node.id).toBeDefined();
      expect(node.labels).toContain('Deal');
      expect(node.properties.name).toBe('Project Gotham');

      const retrieved = await connection.getNode(node.id);
      expect(retrieved.properties).toMatchObject(dealData);
    });

    it('should update node properties', async () => {
      const node = await connection.createNode('Deal', { name: 'Project Helix' });
      
      await connection.updateNode(node.id, { stage: 'Diligence' });
      
      const updated = await connection.getNode(node.id);
      expect(updated.properties.stage).toBe('Diligence');
      expect(updated.properties.name).toBe('Project Helix');
    });

    it('should delete nodes', async () => {
      const node = await connection.createNode('Deal', { name: 'Test Deal' });
      
      await connection.deleteNode(node.id);
      
      await expect(connection.getNode(node.id)).rejects.toThrow('Node not found');
    });
  });

  describe('Relationship Operations', () => {
    it('should create relationships between nodes', async () => {
      const deal = await connection.createNode('Deal', { name: 'Project Gotham' });
      const investor = await connection.createNode('Investor', { name: 'Audax' });
      
      const relationship = await connection.createRelationship(
        investor.id,
        'INTERESTED_IN',
        deal.id,
        { since: new Date().toISOString() }
      );
      
      expect(relationship).toBeDefined();
      expect(relationship.type).toBe('INTERESTED_IN');
      expect(relationship.startNodeId).toBe(investor.id);
      expect(relationship.endNodeId).toBe(deal.id);
    });

    it('should find relationships between nodes', async () => {
      const deal = await connection.createNode('Deal', { name: 'Project Gotham' });
      const email = await connection.createNode('Email', { subject: 'RE: Project Gotham' });
      
      await connection.createRelationship(email.id, 'RELATES_TO', deal.id);
      
      const relationships = await connection.getRelationships(email.id, 'RELATES_TO');
      
      expect(relationships).toHaveLength(1);
      expect(relationships[0].endNodeId).toBe(deal.id);
    });
  });

  describe('Cypher Queries', () => {
    it('should execute raw Cypher queries', async () => {
      await connection.createNode('Deal', { name: 'Project Alpha', stage: 'Sourcing' });
      await connection.createNode('Deal', { name: 'Project Beta', stage: 'LOI' });
      await connection.createNode('Deal', { name: 'Project Gamma', stage: 'LOI' });
      
      const result = await connection.query(
        'MATCH (d:Deal) WHERE d.stage = $stage RETURN d',
        { stage: 'LOI' }
      );
      
      expect(result.records).toHaveLength(2);
      expect(result.records.map(r => r.get('d').properties.name))
        .toEqual(expect.arrayContaining(['Project Beta', 'Project Gamma']));
    });

    it('should handle parameterized queries safely', async () => {
      const maliciousInput = "'; DROP DATABASE neo4j; //";
      
      const result = await connection.query(
        'MATCH (d:Deal) WHERE d.name = $name RETURN d',
        { name: maliciousInput }
      );
      
      expect(result.records).toHaveLength(0);
      // Database should still be intact
      await expect(connection.testConnection()).resolves.toBeTruthy();
    });
  });

  describe('Transaction Support', () => {
    it('should commit transactions successfully', async () => {
      const tx = await connection.beginTransaction();
      
      try {
        const deal = await tx.run(
          'CREATE (d:Deal {name: $name}) RETURN d',
          { name: 'Transaction Deal' }
        );
        
        const investor = await tx.run(
          'CREATE (i:Investor {name: $name}) RETURN i',
          { name: 'Transaction Investor' }
        );
        
        await tx.commit();
        
        // Verify both nodes exist
        const verifyResult = await connection.query(
          'MATCH (d:Deal {name: "Transaction Deal"}), (i:Investor {name: "Transaction Investor"}) RETURN d, i'
        );
        
        expect(verifyResult.records).toHaveLength(1);
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    });

    it('should rollback transactions on error', async () => {
      const tx = await connection.beginTransaction();
      
      try {
        await tx.run(
          'CREATE (d:Deal {name: $name}) RETURN d',
          { name: 'Rollback Deal' }
        );
        
        // Simulate an error
        throw new Error('Simulated error');
      } catch (error) {
        await tx.rollback();
      }
      
      // Verify node was not created
      const result = await connection.query(
        'MATCH (d:Deal {name: "Rollback Deal"}) RETURN d'
      );
      
      expect(result.records).toHaveLength(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should import multiple nodes efficiently', async () => {
      const deals = Array.from({ length: 10 }, (_, i) => ({
        name: `Bulk Deal ${i}`,
        stage: i % 2 === 0 ? 'Sourcing' : 'LOI',
        value: (i + 1) * 1000000
      }));
      
      const results = await connection.bulkCreateNodes('Deal', deals);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.id)).toBe(true);
      
      // Verify all were created
      const count = await connection.query(
        'MATCH (d:Deal) WHERE d.name STARTS WITH "Bulk Deal" RETURN count(d) as count'
      );
      
      expect(count.records[0].get('count').toNumber()).toBe(10);
    });
  });

  describe('Index Management', () => {
    it('should create indexes for performance', async () => {
      await connection.createIndex('Deal', 'name');
      
      const indexes = await connection.getIndexes();
      
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Deal',
            property: 'name'
          })
        ])
      );
    });

    it('should create unique constraints', async () => {
      await connection.createUniqueConstraint('Email', 'messageId');
      
      // Try to create duplicate
      await connection.createNode('Email', { messageId: 'unique-123' });
      
      await expect(
        connection.createNode('Email', { messageId: 'unique-123' })
      ).rejects.toThrow(/constraint/i);
    });
  });
}); 