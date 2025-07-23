const baseConfig = require('./jest.config.base');

/**
 * Main Jest Configuration
 * Default configuration that runs all tests
 * 
 * This configuration:
 * - Runs both unit and e2e tests
 * - Uses balanced settings for mixed test types
 * - Provides a single entry point for test execution
 * - Can be overridden by specific configs when needed
 */
module.exports = {
  ...baseConfig,
  
  // Display name for main test suite
  displayName: 'all',
  
  // Balanced timeout for mixed test types
  testTimeout: 30000,
  
  // Run all test types
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/scripts/**/*.test.ts',
    '<rootDir>/ontologies/**/*.test.ts',
    '<rootDir>/test/**/*.test.ts'
  ],
  
  // Balanced coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Balanced worker configuration
  maxWorkers: '50%',
  
  // Include global setup/teardown for e2e tests
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  
  // Additional setup for all tests
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/test/e2e-setup.ts'
  ]
};