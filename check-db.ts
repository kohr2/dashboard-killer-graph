import 'reflect-metadata';
import { Neo4jConnection } from '@platform/database/neo4j-connection';

async function checkDatabase() {
  const connection = new Neo4jConnection();
  try {
    await connection.connect();
    const session = connection.getDriver().session();
    
    // Check all nodes
    const nodesResult = await session.run('MATCH (n) RETURN labels(n) as labels, count(n) as count');
    console.log('Nodes in database:');
    nodesResult.records.forEach(record => {
      console.log(`${record.get('labels')}: ${record.get('count')}`);
    });
    
    // Check Communication nodes specifically
    const commResult = await session.run('MATCH (c:Communication) RETURN count(c) as count');
    console.log(`\nCommunication nodes: ${commResult.records[0].get('count')}`);
    
    // Check relationships
    const relResult = await session.run('MATCH ()-[r]->() RETURN type(r) as type, count(r) as count');
    console.log('\nRelationships in database:');
    relResult.records.forEach(record => {
      console.log(`${record.get('type')}: ${record.get('count')}`);
    });
    
    await session.close();
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await connection.close();
  }
}

checkDatabase(); 