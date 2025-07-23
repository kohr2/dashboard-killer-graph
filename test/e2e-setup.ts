import 'reflect-metadata';
import { container } from 'tsyringe';

/**
 * E2E Test Setup
 * Additional configuration for end-to-end tests
 * 
 * This file is loaded after the base setup and provides
 * e2e-specific configurations like:
 * - Database connection setup
 * - External service mocks
 * - Test data preparation
 * - Environment-specific configurations
 */

// Increase timeout for e2e tests
jest.setTimeout(60000);

// Global e2e test configuration
beforeAll(async () => {
  console.log('🔧 Setting up E2E test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEO4J_DATABASE = 'test-database';
  process.env.MCP_ACTIVE_ONTOLOGIES = 'core,testont';
  
  // Register e2e-specific services
  // Note: These may be different from unit test services
  // as e2e tests often use real implementations
  
  console.log('✅ E2E test environment ready');
});

// Global cleanup after all e2e tests
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Clean up any persistent resources
  // Close database connections, etc.
  
  console.log('✅ E2E test environment cleaned up');
});

// Per-test setup
beforeEach(async () => {
  // Reset any test state between tests
  // Clear database, reset mocks, etc.
});

// Per-test cleanup
afterEach(async () => {
  // Clean up after each test
  // Rollback transactions, clear caches, etc.
});

// Export for use in individual test files
export const e2eConfig = {
  database: process.env.NEO4J_DATABASE || 'test-database',
  ontologies: process.env.MCP_ACTIVE_ONTOLOGIES || 'core,testont',
  timeout: 60000
}; 