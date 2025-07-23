const baseConfig = require('./jest.config.base');

/**
 * Unit Test Configuration
 * Extends base configuration with unit-specific settings
 * 
 * Unit tests:
 * - Test individual functions and classes in isolation
 * - Mock external dependencies (databases, APIs, etc.)
 * - Fast execution (< 1 second per test)
 * - No external service dependencies
 */
module.exports = {
  ...baseConfig,
  
  // Override display name for better test reporting
  displayName: 'unit',
  
  // Unit tests should be fast - shorter timeout
  testTimeout: 5000,
  
  // Unit tests don't need global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Unit test patterns - focus on isolated tests
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/scripts/**/__tests__/**/*.test.ts',
    '<rootDir>/scripts/**/*.test.ts',
    '<rootDir>/ontologies/**/__tests__/**/*.test.ts',
    '<rootDir>/ontologies/**/*.test.ts',
    '<rootDir>/test/unit/**/*.test.ts'
  ],
  
  // Exclude e2e tests from unit test runs
  testPathIgnorePatterns: [
    '<rootDir>/test/e2e/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // Coverage thresholds for unit tests (higher standards)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Unit tests should be deterministic
  randomize: false,
  
  // Faster execution for unit tests
  maxWorkers: '50%',
  
  // Verbose output for debugging unit tests
  verbose: true,
  
  // Collect coverage from unit test files
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    '!**/e2e/**',
    '!**/integration/**'
  ]
}; 