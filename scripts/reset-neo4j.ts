import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '../src/platform/database/neo4j-connection';

async function resetDatabase() {
  console.log('🔥 Wiping the Neo4j database...');
  const connection = container.resolve(Neo4jConnection);
  await connection.connect();
  const session = connection.getDriver().session();

  try {
    console.log('   -> Running DETACH DELETE query...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('   ✅ Database has been completely wiped.');
  } catch (error) {
    console.error('   ❌ Failed to wipe the database:', error);
  } finally {
    await session.close();
    await connection.close();
    console.log('   -> Connection closed.');
  }
}

// Export the function to be used in tests
export { resetDatabase };

if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('✅ Database reset completed successfully.');
    })
    .catch(console.error);
} 