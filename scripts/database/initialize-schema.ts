import { Neo4jConnection } from '../src/platform/database/neo4j-connection';
import { config } from 'dotenv';
import { Session } from 'neo4j-driver';

config();

async function initialize() {
  console.log('Connecting to Neo4j...');
  const connection = Neo4jConnection.getInstance();
  
  try {
    await connection.connect();
    console.log('Initializing Neo4j schema...');
    await connection.initializeSchema();
    console.log('✅ Schema initialization complete.');
  } catch (error) {
    console.error('❌ Failed to initialize Neo4j schema:', error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

initialize(); 