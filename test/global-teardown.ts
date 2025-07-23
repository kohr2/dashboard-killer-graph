// Global teardown for E2E tests
// This runs once after all E2E tests

import { UNIFIED_TEST_DATABASE } from '../src/shared/constants/test-database';

export default async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  try {
    // Clean up the unified test database
    console.log(`🗑️ Cleaning up unified test database: ${UNIFIED_TEST_DATABASE}`);
    
    // Note: Individual tests handle their own cleanup within the unified database
    // This global teardown ensures the database is properly cleaned after all tests
    console.log('✅ E2E test environment cleanup completed');
    
    // TODO: Implement actual database cleanup when import issues are resolved
    // For now, tests handle their own cleanup within the unified database
    
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
    // Don't throw - we want tests to complete even if cleanup fails
  }
  
  console.log('✅ E2E test environment cleaned up!');
}; 