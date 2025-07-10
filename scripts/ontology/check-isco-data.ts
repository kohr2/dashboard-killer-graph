#!/usr/bin/env ts-node

import "reflect-metadata";
import neo4j from 'neo4j-driver';

async function checkISCOData() {
  const uri = 'bolt://localhost:7687';
  const username = 'neo4j';
  const password = 'dashboard-killer';
  const database = 'isco';
  
  console.log(`Checking ISCO data in database: ${database}...`);
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  
  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j successfully!');
    
    const session = driver.session({ database });
    try {
      // Check for ISCO entities
      const entityResult = await session.run('MATCH (n) RETURN labels(n) as labels, count(n) as count');
      console.log('\n📊 Database contents:');
      entityResult.records.forEach(record => {
        const labels = record.get('labels');
        const count = record.get('count');
        console.log(`  ${labels.join(':')}: ${count} nodes`);
      });
      
      // Check specifically for ISCO entities
      const iscoResult = await session.run('MATCH (n:ISCOMajorGroup) RETURN count(n) as count');
      const iscoCount = iscoResult.records[0].get('count').toNumber();
      console.log(`\n🎯 ISCOMajorGroup entities: ${iscoCount}`);
      
      if (iscoCount > 0) {
        console.log('✅ ISCO data has been successfully ingested!');
        
        // Show sample data
        const sampleResult = await session.run('MATCH (n:ISCOMajorGroup) RETURN n.name as name, n.code as code LIMIT 3');
        console.log('\n📋 Sample ISCO Major Groups:');
        sampleResult.records.forEach(record => {
          console.log(`  ${record.get('code')}: ${record.get('name')}`);
        });
      } else {
        console.log('❌ No ISCO data found yet. Ingestion may still be in progress...');
      }
      
    } catch (dbError: any) {
      console.log('❌ Database query failed:', dbError.message);
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
  checkISCOData().catch(console.error);
} 