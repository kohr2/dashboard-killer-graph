import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';

async function resetDatabase() {
  console.log('🔥 Wiping the Neo4j database...');
  // Since this is a standalone script, we need to register dependencies manually.
  // We're not using the full app's dependency injection container here.
  container.register<Neo4jConnection>(Neo4jConnection, {
    useValue: new Neo4jConnection(),
  });
  const connection = container.resolve(Neo4jConnection);
  try {
    await connection.connect();
    const session = connection.getDriver().session();
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ Database wiped successfully.');
  } catch (error) {
    console.error('❌ Failed to wipe database:', error);
  } finally {
    await connection.close();
  }
}

// Export the function to be used in tests
export { resetDatabase };

// If the script is run directly, execute the function
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database reset complete.');
      process.exit(0);
    })
    .catch(error => {
      console.error('An error occurred during database reset:', error);
      process.exit(1);
    });
} 