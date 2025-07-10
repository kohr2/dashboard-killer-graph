#!/usr/bin/env ts-node

import "reflect-metadata";
import neo4j from 'neo4j-driver';

async function clearISCODatabase() {
  const uri = 'bolt://localhost:7687';
  const username = 'neo4j';
  const password = 'dashboard-killer';
  const database = 'isco';
  
  console.log(`🗑️ Clearing ISCO database: ${database}...`);
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  
  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j successfully!');
    
    const session = driver.session({ database });
    try {
      // Clear all nodes and relationships
      const result = await session.run('MATCH (n) DETACH DELETE n');
      console.log('✅ All nodes and relationships deleted from ISCO database');
      
      // Verify database is empty
      const countResult = await session.run('MATCH (n) RETURN count(n) as count');
      const count = countResult.records[0].get('count').toNumber();
      console.log(`📊 Database now contains ${count} nodes`);
      
    } catch (dbError: any) {
      console.log('❌ Database operation failed:', dbError.message);
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.log('❌ Connection failed:', error.message);
  } finally {
    await driver.close();
  }
}

if (require.main === module) {
  clearISCODatabase().catch(console.error);
} 