#!/usr/bin/env ts-node

import "reflect-metadata";
import neo4j from 'neo4j-driver';

async function testConnection(uri: string, username: string, password: string, database: string) {
  console.log(`Testing connection to ${uri} with ${username}/${password} on database ${database}...`);
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  
  try {
    await driver.verifyConnectivity();
    console.log('✅ Connection successful!');
    
    // Test database access
    const session = driver.session({ database });
    try {
      const result = await session.run('RETURN 1 as test');
      console.log('✅ Database access successful!');
      console.log('Result:', result.records[0].get('test').toNumber());
    } catch (dbError: any) {
      console.log('❌ Database access failed:', dbError.message);
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.log('❌ Connection failed:', error.message);
  } finally {
    await driver.close();
  }
}

async function main() {
  const configs = [
    { uri: 'bolt://localhost:7687', username: 'neo4j', password: 'neo4j', database: 'neo4j' },
    { uri: 'bolt://localhost:7687', username: 'neo4j', password: 'password', database: 'neo4j' },
    { uri: 'bolt://localhost:7687', username: 'neo4j', password: 'dashboard-killer', database: 'neo4j' },
    { uri: 'bolt://localhost:7687', username: 'neo4j', password: 'neo4j', database: 'fibo' },
    { uri: 'bolt://localhost:7687', username: 'neo4j', password: 'password', database: 'fibo' },
  ];
  
  for (const config of configs) {
    console.log('\n' + '='.repeat(60));
    await testConnection(config.uri, config.username, config.password, config.database);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 