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

    // NEW: Step 3.2 - Find and drop constraints associated with unused labels
    console.log('⚡ Checking for constraints on unused labels...');
    const showConstraintsResult = await session.run("SHOW CONSTRAINTS");
    const constraintsToDrop = showConstraintsResult.records
        .map(record => record.get('name') as string)
        .filter(name => name); // Filter out null names if any

    const constraintsOnUnusedLabels = showConstraintsResult.records
        .filter(record => {
            const labels = record.get('labelsOrTypes') as string[];
            return labels && labels.some(label => labelsToRemove.includes(label));
        })
        .map(record => record.get('name') as string);
    
    if (constraintsOnUnusedLabels.length > 0) {
        console.warn(`🔥 Found ${constraintsOnUnusedLabels.length} constraints to drop:`, constraintsOnUnusedLabels);
        for (const name of constraintsOnUnusedLabels) {
            const dropQuery = `DROP CONSTRAINT \`${name}\` IF EXISTS`;
            console.log(`   -> Executing: ${dropQuery}`);
            await session.run(dropQuery);
            console.log(`      -> Dropped constraint "${name}".`);
        }
    } else {
        console.log('✨ No conflicting constraints found on unused labels.');
    }

    // NEW: Step 3.5 - Find and drop any indexes associated with the unused labels
    console.log('⚡ Checking for indexes on unused labels...');
    const showIndexesResult = await session.run("SHOW INDEXES");
    const indexesToDrop = showIndexesResult.records
        .map(record => ({
            name: record.get('name') as string,
            labels: record.get('labelsOrTypes') as string[]
        }))
        .filter(index => 
            index.labels && index.labels.some((label: string) => labelsToRemove.includes(label))
        );

    if (indexesToDrop.length > 0) {
        console.warn(`🔥 Found ${indexesToDrop.length} indexes built on unused labels that will be dropped:`, indexesToDrop.map(i => i.name));
        for (const index of indexesToDrop) {
            // Use backticks for safety, although index names usually don't need it.
            const dropQuery = `DROP INDEX \`${index.name}\` IF EXISTS`;
            console.log(`   -> Executing: ${dropQuery}`);
            await session.run(dropQuery);
            console.log(`      -> Dropped index "${index.name}".`);
        }
    } else {
        console.log('✨ No conflicting indexes found on unused labels.');
    }

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