#!/usr/bin/env ts-node

import 'reflect-metadata';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';

async function manageDatabases() {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🗄️ Neo4j Database Management Script
====================================

Usage: npx ts-node scripts/database/create-database.ts [command] [options]

Commands:
  create <name>     Create a new database
  list              List all databases
  drop <name>       Drop a database (cannot drop system databases)
  info <name>       Show database information

Options:
  --help, -h        Show this help message

Examples:
  # Create a new database
  npx ts-node scripts/database/create-database.ts create procurement_db

  # List all databases
  npx ts-node scripts/database/create-database.ts list

  # Drop a database
  npx ts-node scripts/database/create-database.ts drop test_db

  # Show database info
  npx ts-node scripts/database/create-database.ts info procurement_db

Common database names:
  - procurement    Procurement domain database
  - financial      Financial domain database
  - crm           CRM domain database
  - legal         Legal domain database
  - healthcare    Healthcare domain database
  - test          Test database
  - neo4j         Default database (always exists)

Requirements:
  - Neo4j database running
  - Proper Neo4j credentials in environment variables
`);
    process.exit(0);
  }

  const command = process.argv[2];
  const databaseName = process.argv[3];

  if (!command) {
    console.error('❌ No command specified. Use --help for usage information.');
    process.exit(1);
  }

  const connection = new Neo4jConnection();

  try {
    await connection.connect();

    switch (command) {
      case 'create':
        if (!databaseName) {
          console.error('❌ Database name required for create command');
          process.exit(1);
        }
        await createDatabase(connection, databaseName);
        break;

      case 'list':
        await listDatabases(connection);
        break;

      case 'drop':
        if (!databaseName) {
          console.error('❌ Database name required for drop command');
          process.exit(1);
        }
        await dropDatabase(connection, databaseName);
        break;

      case 'info':
        if (!databaseName) {
          console.error('❌ Database name required for info command');
          process.exit(1);
        }
        await showDatabaseInfo(connection, databaseName);
        break;

      default:
        console.error(`❌ Unknown command: ${command}. Use --help for usage information.`);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

async function createDatabase(connection: Neo4jConnection, databaseName: string): Promise<void> {
  console.log(`🗄️ Creating database: ${databaseName}`);
  
  try {
    // Set the database name temporarily to create it
    process.env.NEO4J_DATABASE = databaseName;
    
    // The ensureDatabaseExists method will be called during connection
    // We need to create a new connection instance with the new database name
    const tempConnection = new Neo4jConnection();
    await tempConnection.connect();
    
    console.log(`✅ Database ${databaseName} created successfully`);
    await tempConnection.close();
  } catch (error) {
    console.error(`❌ Failed to create database ${databaseName}:`, error);
    throw error;
  }
}

async function listDatabases(connection: Neo4jConnection): Promise<void> {
  console.log('📋 Listing all databases:');
  
  try {
    const databases = await connection.listDatabases();
    
    if (databases.length === 0) {
      console.log('   No databases found');
    } else {
      databases.forEach(db => {
        const isSystem = db === 'neo4j' || db === 'system';
        const marker = isSystem ? '🔒' : '📁';
        console.log(`   ${marker} ${db}${isSystem ? ' (system)' : ''}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to list databases:', error);
    throw error;
  }
}

async function dropDatabase(connection: Neo4jConnection, databaseName: string): Promise<void> {
  if (databaseName === 'neo4j' || databaseName === 'system') {
    console.error('❌ Cannot drop system databases (neo4j, system)');
    process.exit(1);
  }

  console.log(`🗑️ Dropping database: ${databaseName}`);
  
  try {
    await connection.dropDatabase(databaseName);
    console.log(`✅ Database ${databaseName} dropped successfully`);
  } catch (error) {
    console.error(`❌ Failed to drop database ${databaseName}:`, error);
    throw error;
  }
}

async function showDatabaseInfo(connection: Neo4jConnection, databaseName: string): Promise<void> {
  console.log(`ℹ️ Database information for: ${databaseName}`);
  
  try {
    const databases = await connection.listDatabases();
    const exists = databases.includes(databaseName);
    
    if (!exists) {
      console.log(`   ❌ Database ${databaseName} does not exist`);
      return;
    }

    const isSystem = databaseName === 'neo4j' || databaseName === 'system';
    console.log(`   📁 Name: ${databaseName}`);
    console.log(`   🔒 System: ${isSystem ? 'Yes' : 'No'}`);
    console.log(`   ✅ Status: Exists`);
    
    if (!isSystem) {
      console.log(`   💡 Tip: Use this database with --database=${databaseName} in ingestion scripts`);
    }
  } catch (error) {
    console.error('❌ Failed to get database info:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  manageDatabases().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
} 