const baseConfig = require('./jest.config.base');

/**
 * End-to-End Test Configuration
 * Extends base configuration with e2e-specific settings
 * 
 * E2E tests:
 * - Test complete workflows and integrations
 * - Use real external services (databases, APIs, etc.)
 * - Slower execution (may take several seconds per test)
 * - Require external service setup and teardown
 */
module.exports = {
  ...baseConfig,
  
  // Override display name for better test reporting
  displayName: 'e2e',
  
  // E2E tests need longer timeouts for external services
  testTimeout: 60000,
  
  // E2E tests require global setup/teardown for external services
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  
  // E2E test patterns - focus on integration tests
  testMatch: [
    '<rootDir>/test/e2e/**/*.test.ts',
    '<rootDir>/test/integration/**/*.test.ts'
  ],
  
  // Exclude unit tests from e2e test runs
  testPathIgnorePatterns: [
    '<rootDir>/src/**/__tests__/**',
    '<rootDir>/scripts/**/__tests__/**',
    '<rootDir>/ontologies/**/__tests__/**',
    '<rootDir>/test/unit/**',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // Coverage thresholds for e2e tests (lower standards due to complexity)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // E2E tests may be non-deterministic due to external factors
  randomize: false,
  
  // Slower execution for e2e tests to avoid overwhelming external services
  maxWorkers: '25%',
  
  // Verbose output for debugging e2e tests
  verbose: true,
  
  // Collect coverage from e2e test files
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    '!**/unit/**',
    '!**/__tests__/**'
  ],
  
  // E2E tests may have open handles due to external connections
  detectOpenHandles: true,
  
  // Force exit after e2e tests to clean up external connections
  forceExit: true,
  
  // Additional setup for e2e tests
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/test/e2e-setup.ts'
  ]
}; 