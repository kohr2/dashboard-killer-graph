#!/usr/bin/env ts-node

import 'reflect-metadata';
import { getDatabaseUtils } from './lib/database-utils';
import { logger } from '../../src/shared/utils/logger';

/**
 * Database Reset Script
 * 
 * Resets a database by clearing all nodes and relationships.
 * This is useful for testing and development purposes.
 */

async function resetDatabase(databaseName?: string) {
  const dbUtils = getDatabaseUtils();
  
  try {
    if (databaseName) {
      logger.info(`🔥 Resetting database: ${databaseName}`);
    } else {
      logger.info('🔥 Resetting default database');
    }
    
    await dbUtils.resetDatabase(databaseName);
    logger.info('✅ Database reset completed successfully');
    
  } catch (error) {
    logger.error('❌ Failed to reset database:', error);
    throw error;
  } finally {
    await dbUtils.closeConnection();
  }
}

// Export the function to be used in tests
export { resetDatabase };

// If the script is run directly, execute the function
if (require.main === module) {
  const args = process.argv.slice(2);
  const databaseName = args[0]; // First argument is the database name
  
  resetDatabase(databaseName)
    .then(() => {
      logger.info('Database reset complete');
      process.exit(0);
    })
    .catch(error => {
      logger.error('An error occurred during database reset:', error);
      process.exit(1);
    });
} 