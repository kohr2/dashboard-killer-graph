#!/usr/bin/env ts-node
import 'reflect-metadata';
import { Neo4jConnection } from '../../src/platform/database/neo4j-connection';

async function queryDatabase() {
  const connection = new Neo4jConnection();
  
  try {
    await connection.connect();
    const session = connection.getSession();
    
    // Count Communication nodes
    const communicationResult = await session.run('MATCH (c:Communication) RETURN count(c) as count');
    console.log(`Communication nodes: ${communicationResult.records[0].get('count')}`);
    
    // Show Communication node details
    const communicationDetails = await session.run('MATCH (c:Communication) RETURN c.id as id, c.sourceFile as sourceFile, c.subject as subject LIMIT 10');
    console.log('\nCommunication node details:');
    communicationDetails.records.forEach((record: any) => {
      console.log(`  ID: ${record.get('id')}`);
      console.log(`  SourceFile: ${record.get('sourceFile')}`);
      console.log(`  Subject: ${record.get('subject')}`);
      console.log('  ---');
    });
    
    // Count all nodes
    const allNodesResult = await session.run('MATCH (n) RETURN count(n) as count');
    console.log(`Total nodes: ${allNodesResult.records[0].get('count')}`);
    
    // Count relationships
    const relationshipsResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    console.log(`Total relationships: ${relationshipsResult.records[0].get('count')}`);
    
    // List all node labels
    const labelsResult = await session.run('CALL db.labels() YIELD label RETURN collect(label) as labels');
    console.log(`Node labels: ${labelsResult.records[0].get('labels')}`);
    
    // Count nodes by label
    const labelCountsResult = await session.run(`
      CALL db.labels() YIELD label
      CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) as count', {}) YIELD value
      RETURN label, value.count as count
      ORDER BY count DESC
    `);
    
    console.log('\nNodes by label:');
    labelCountsResult.records.forEach((record: any) => {
      console.log(`  ${record.get('label')}: ${record.get('count')}`);
    });
    
    await session.close();
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await connection.close();
  }
}

queryDatabase().catch(console.error); 