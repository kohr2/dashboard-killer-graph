import 'reflect-metadata';
import { container } from 'tsyringe';
import { initializeExtensions } from '../src/register-extensions';
import { Neo4jConnection } from '../src/platform/database/neo4j-connection';
import { OntologyService } from '../src/platform/ontology/ontology.service';

async function cleanupDatabaseLabels() {
  console.log('🚀 Starting database label cleanup...');

  // 1. Initialize services to get the valid labels from our ontologies
  initializeExtensions();
  const ontologyService = container.resolve(OntologyService);
  const validLabels = new Set(ontologyService.getAllEntityTypes());
  console.log(`✅ Found ${validLabels.size} valid labels defined in the ontologies.`);

  const connection = container.resolve(Neo4jConnection);
  await connection.connect();
  const session = connection.getDriver().session();

  try {
    // 2. Get all labels currently in the database
    console.log('⚡ Fetching all labels from the Neo4j database...');
    const result = await session.run("CALL db.labels()");
    const dbLabels = new Set(result.records.map(record => record.get('label')));
    console.log(`🔎 Found ${dbLabels.size} unique labels in the database.`);

    // 3. Calculate the difference
    const labelsToRemove = [...dbLabels].filter(label => !validLabels.has(label));

    if (labelsToRemove.length === 0) {
      console.log('✨ Database is already clean. No unused labels found.');
      return;
    }

    console.warn(`🔥 Found ${labelsToRemove.length} unused labels to remove:`, labelsToRemove);

    // 4. Remove the unused labels
    for (const label of labelsToRemove) {
      // It's crucial to use backticks to escape label names that might contain special characters
      const query = `MATCH (n:\`${label}\`) REMOVE n:\`${label}\``;
      console.log(`   -> Executing: ${query}`);
      const removeResult = await session.run(query);
      console.log(`      Removed label "${label}" from ${removeResult.summary.counters.updates().propertiesSet} nodes.`);
    }

    console.log('✅ Cleanup complete.');

  } catch (error) {
    console.error('❌ An error occurred during the cleanup process:', error);
  } finally {
    await session.close();
    await connection.close();
    console.log('🔌 Connection closed.');
  }
}

cleanupDatabaseLabels().catch(console.error); 