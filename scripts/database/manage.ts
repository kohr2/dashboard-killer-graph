#!/usr/bin/env ts-node

import 'reflect-metadata';
import { getDatabaseUtils } from './lib/database-utils';
import { logger } from '../../src/shared/utils/logger';

/**
 * Unified Database Management Script
 * 
 * This script provides a single interface for all database operations:
 * - Database creation, listing, and deletion
 * - Schema initialization
 * - Data reset and cleanup
 * - Statistics and monitoring
 * - Ingestion operations
 */

interface CommandOptions {
  database?: string;
  force?: boolean;
  verbose?: boolean;
}

async function showHelp() {
  console.log(`
🗄️ Unified Database Management Script
=====================================

Usage: npx ts-node scripts/database/manage.ts <command> [options]

Commands:
  Database Management:
    create <name>              Create a new database
    list                       List all databases
    drop <name>               Drop a database (cannot drop system databases)
    info <name>               Show database information
    reset [name]              Reset database (clear all data)

  Schema & Setup:
    init-schema [name]         Initialize database schema
    cleanup-labels [name]      Clean up unused database labels

  Data Operations:
    stats [name]               Show database statistics
    query [name] <cypher>      Execute a Cypher query
    ingest-emails [name]       Ingest email data
    build-graph [name]         Build graph from extraction report

  Maintenance:
    health-check [name]        Check database health
    optimize [name]            Optimize database performance

Options:
  --database, -d <name>       Specify database name
  --force, -f                 Force operations without confirmation
  --verbose, -v               Enable verbose output
  --help, -h                  Show this help message

Examples:
  # Create a new database
  npx ts-node scripts/database/manage.ts create procurement_db

  # List all databases
  npx ts-node scripts/database/manage.ts list

  # Reset a specific database
  npx ts-node scripts/database/manage.ts reset procurement_db

  # Show database statistics
  npx ts-node scripts/database/manage.ts stats procurement_db

  # Execute a query
  npx ts-node scripts/database/manage.ts query procurement_db "MATCH (n) RETURN count(n)"

  # Ingest emails into database
  npx ts-node scripts/database/manage.ts ingest-emails procurement_db

Common database names:
  - procurement    Procurement domain database
  - financial      Financial domain database
  - crm           CRM domain database
  - test          Test database
  - neo4j         Default database (always exists)

Requirements:
  - Neo4j database running
  - Proper Neo4j credentials in environment variables
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Show help if no command or help flag
  if (!command || command === '--help' || command === '-h') {
    await showHelp();
    process.exit(0);
  }

  const dbUtils = getDatabaseUtils();

  try {
    switch (command) {
      case 'create':
        await handleCreate(args.slice(1), dbUtils);
        break;

      case 'list':
        await handleList(dbUtils);
        break;

      case 'drop':
        await handleDrop(args.slice(1), dbUtils);
        break;

      case 'info':
        await handleInfo(args.slice(1), dbUtils);
        break;

      case 'reset':
        await handleReset(args.slice(1), dbUtils);
        break;

      case 'init-schema':
        await handleInitSchema(args.slice(1), dbUtils);
        break;

      case 'cleanup-labels':
        await handleCleanupLabels(args.slice(1), dbUtils);
        break;

      case 'stats':
        await handleStats(args.slice(1), dbUtils);
        break;

      case 'query':
        await handleQuery(args.slice(1), dbUtils);
        break;

      case 'ingest-emails':
        await handleIngestEmails(args.slice(1), dbUtils);
        break;

      case 'build-graph':
        await handleBuildGraph(args.slice(1), dbUtils);
        break;

      case 'health-check':
        await handleHealthCheck(args.slice(1), dbUtils);
        break;

      case 'optimize':
        await handleOptimize(args.slice(1), dbUtils);
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        console.log('Use --help for available commands');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Command failed:', error);
    process.exit(1);
  } finally {
    await dbUtils.closeConnection();
  }
}

// Command handlers
async function handleCreate(args: string[], dbUtils: any) {
  const databaseName = args[0];
  if (!databaseName) {
    throw new Error('Database name required for create command');
  }
  await dbUtils.createDatabase(databaseName);
}

async function handleList(dbUtils: any) {
  const databases = await dbUtils.listDatabases();
  console.log('📋 Available databases:');
  databases.forEach((db: string) => {
    const isSystem = db === 'neo4j' || db === 'system';
    const marker = isSystem ? '🔒' : '📁';
    console.log(`   ${marker} ${db}${isSystem ? ' (system)' : ''}`);
  });
}

async function handleDrop(args: string[], dbUtils: any) {
  const databaseName = args[0];
  if (!databaseName) {
    throw new Error('Database name required for drop command');
  }
  await dbUtils.dropDatabase(databaseName);
}

async function handleInfo(args: string[], dbUtils: any) {
  const databaseName = args[0];
  if (!databaseName) {
    throw new Error('Database name required for info command');
  }
  
  const databases = await dbUtils.listDatabases();
  const exists = databases.includes(databaseName);
  
  console.log(`ℹ️ Database information for: ${databaseName}`);
  console.log(`   📁 Name: ${databaseName}`);
  console.log(`   ✅ Status: ${exists ? 'Exists' : 'Does not exist'}`);
  
  if (exists) {
    const isSystem = databaseName === 'neo4j' || databaseName === 'system';
    console.log(`   🔒 System: ${isSystem ? 'Yes' : 'No'}`);
    
    if (!isSystem) {
      const stats = await dbUtils.getDatabaseStats(databaseName);
      console.log(`   📊 Nodes: ${stats.nodeCount}`);
      console.log(`   🔗 Relationships: ${stats.relationshipCount}`);
      console.log(`   🏷️ Labels: ${stats.labels.length}`);
    }
  }
}

async function handleReset(args: string[], dbUtils: any) {
  const databaseName = args[0];
  await dbUtils.resetDatabase(databaseName);
}

async function handleInitSchema(args: string[], dbUtils: any) {
  const databaseName = args[0];
  await dbUtils.initializeSchema(databaseName);
}

async function handleCleanupLabels(args: string[], dbUtils: any) {
  const databaseName = args[0];
  await dbUtils.cleanupLabels(databaseName);
}

async function handleStats(args: string[], dbUtils: any) {
  const databaseName = args[0];
  const stats = await dbUtils.getDatabaseStats(databaseName);
  
  console.log(`📊 Database Statistics${databaseName ? ` for ${databaseName}` : ''}:`);
  console.log(`   📊 Total Nodes: ${stats.nodeCount}`);
  console.log(`   🔗 Total Relationships: ${stats.relationshipCount}`);
  console.log(`   🏷️ Labels (${stats.labels.length}): ${stats.labels.join(', ')}`);
}

async function handleQuery(args: string[], dbUtils: any) {
  const databaseName = args[0];
  const query = args[1];
  
  if (!query) {
    throw new Error('Cypher query required');
  }
  
  await dbUtils.executeWithSession(async (session: any) => {
    const result = await session.run(query);
    console.log('📋 Query Results:');
    result.records.forEach((record: any, index: number) => {
      console.log(`   Record ${index + 1}:`, record.toObject());
    });
  }, databaseName);
}

async function handleIngestEmails(args: string[], dbUtils: any) {
  const databaseName = args[0];
  const emailsDir = args[1]; // Optional emails directory
  
  console.log('📧 Email ingestion is available through the unified script');
  console.log('⚠️ For full email processing, use the dedicated run-neo4j-ingestion.ts script');
  
  await dbUtils.ingestEmails(databaseName, emailsDir);
}

async function handleBuildGraph(args: string[], dbUtils: any) {
  const databaseName = args[0];
  const reportPath = args[1]; // Optional report path
  
  console.log('🏗️ Graph building is available through the unified script');
  await dbUtils.buildGraph(databaseName, reportPath);
}

async function handleHealthCheck(args: string[], dbUtils: any) {
  const databaseName = args[0];
  
  try {
    const stats = await dbUtils.getDatabaseStats(databaseName);
    console.log(`✅ Database Health Check${databaseName ? ` for ${databaseName}` : ''}:`);
    console.log(`   🔗 Connection: OK`);
    console.log(`   📊 Nodes: ${stats.nodeCount}`);
    console.log(`   🔗 Relationships: ${stats.relationshipCount}`);
    console.log(`   🏷️ Labels: ${stats.labels.length}`);
    console.log(`   ✅ Status: Healthy`);
  } catch (error) {
    console.log(`❌ Database Health Check${databaseName ? ` for ${databaseName}` : ''}:`);
    console.log(`   ❌ Status: Unhealthy`);
    console.log(`   🔍 Error: ${error}`);
  }
}

async function handleOptimize(args: string[], dbUtils: any) {
  const databaseName = args[0];
  console.log('🚀 Database optimization is available through the unified script');
  await dbUtils.optimizeDatabase(databaseName);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
} 