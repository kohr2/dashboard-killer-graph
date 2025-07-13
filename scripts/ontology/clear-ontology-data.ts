#!/usr/bin/env ts-node

import "reflect-metadata";
import { Neo4jConnection } from '../../src/platform/database/neo4j-connection';

/**
 * Clear Ontology Data CLI
 * 
 * Usage:
 * npx ts-node -r tsconfig-paths/register scripts/ontology/clear-ontology-data.ts \
 *   --ontology isco \
 *   --database jobboardkiller
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const ontologyName = getArgValue(args, '--ontology');
  const databaseName = getArgValue(args, '--database');

  // Validate required arguments
  if (!ontologyName) {
    console.error('❌ --ontology is required');
    console.error('Usage: --ontology <name> --database <name>');
    process.exit(1);
  }

  if (!databaseName) {
    console.error('❌ --database is required');
    console.error('Usage: --ontology <name> --database <name>');
    process.exit(1);
  }

  try {
    // Set database name in environment for Neo4j connection
    process.env.NEO4J_DATABASE = databaseName;

    console.log(`🗑️ Clearing ${ontologyName} data from ${databaseName} database...`);

    // Connect to Neo4j
    const neo4jConnection = new Neo4jConnection();
    await neo4jConnection.connect();
    
    const session = neo4jConnection.getSession();
    if (!session) {
      throw new Error('Failed to create Neo4j session');
    }

    try {
      // Delete all nodes with the specified ontology
      const result = await session.run(
        'MATCH (n) WHERE n.ontology = $ontology DETACH DELETE n RETURN count(n) as deletedCount',
        { ontology: ontologyName }
      );

      const deletedCount = result.records[0]?.get('deletedCount') || 0;
      console.log(`✅ Cleared ${deletedCount} nodes from ${ontologyName} ontology in ${databaseName} database`);

    } finally {
      await session.close();
      await neo4jConnection.close();
    }

  } catch (error) {
    console.error('❌ Failed to clear ontology data:', error);
    process.exit(1);
  }
}

/**
 * Get argument value from command line arguments
 */
function getArgValue(args: string[], argName: string): string | undefined {
  const index = args.indexOf(argName);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }
  return args[index + 1];
}

if (require.main === module) {
  main().catch(console.error);
} 