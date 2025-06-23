module.exports = {
  ...require('./jest.base.config.js'),
  displayName: 'Integration Tests',
  testMatch: ['**/test/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/../test/setup-integration.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run integration tests sequentially
  collectCoverageFrom: [
    'src/infrastructure/**/*.ts',
    'src/interface/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
}; 