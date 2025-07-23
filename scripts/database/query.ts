#!/usr/bin/env ts-node

import 'reflect-metadata';
import { getDatabaseUtils } from './lib/database-utils';
import { logger } from '../../src/shared/utils/logger';

/**
 * Database Query Script
 * 
 * Executes Cypher queries against the database and displays results.
 * Useful for debugging and data exploration.
 */

async function queryDatabase(databaseName?: string, customQuery?: string) {
  const dbUtils = getDatabaseUtils();
  
  try {
    await dbUtils.getConnection(databaseName);
    logger.info(`Querying database: ${dbUtils.getConnection().getDatabase()}`);
    
    // Default queries if none provided
    const queries = customQuery ? [customQuery] : [
      'MATCH (c:Communication) RETURN count(c) as count',
      'MATCH (c:Communication) RETURN c.id as id, c.sourceFile as sourceFile, c.subject as subject LIMIT 10',
      'MATCH (n) RETURN count(n) as count',
      'MATCH ()-[r]->() RETURN count(r) as count',
      'CALL db.labels() YIELD label RETURN collect(label) as labels'
    ];

    for (const query of queries) {
      await dbUtils.executeWithSession(async (session: any) => {
        logger.info(`Executing query: ${query}`);
        const result = await session.run(query);
        
        console.log('\n📋 Query Results:');
        result.records.forEach((record: any, index: number) => {
          console.log(`   Record ${index + 1}:`, record.toObject());
        });
      }, databaseName);
    }
    
  } catch (error) {
    logger.error('Error querying database:', error);
    throw error;
  } finally {
    await dbUtils.closeConnection();
  }
}

// If the script is run directly, execute the function
if (require.main === module) {
  const args = process.argv.slice(2);
  const databaseName = args[0];
  const customQuery = args[1];
  
  queryDatabase(databaseName, customQuery)
    .then(() => {
      logger.info('Query execution complete');
      process.exit(0);
    })
    .catch(error => {
      logger.error('An error occurred during query execution:', error);
      process.exit(1);
    });
} 