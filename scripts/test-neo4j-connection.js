const neo4j = require('neo4j-driver');

async function testNeo4jConnection() {
  const uri = 'bolt://localhost:7687';
  const user = 'neo4j';
  const password = 'dashboard-killer';
  
  console.log('Testing Neo4j connection...');
  console.log(`URI: ${uri}`);
  console.log(`User: ${user}`);
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  
  try {
    // Test connectivity
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connection successful!');
    
    // Test a simple query
    const session = driver.session();
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Query test successful:', result.records[0].get('test'));
    
    await session.close();
    await driver.close();
    
    console.log('🎉 Neo4j is ready for integration tests!');
    return true;
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Make sure Neo4j Desktop is running');
    console.log('2. Create a database on port 7688');
    console.log('3. Set password to "dashboard-killer"');
    console.log('4. Start the database in Neo4j Desktop');
    return false;
  }
}

testNeo4jConnection(); 