module.exports = {
  ...require('./jest.base.config.js'),
  displayName: 'E2E Tests',
  testMatch: ['**/test/e2e/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/../test/setup-e2e.ts'],
  testTimeout: 60000,
  maxWorkers: 1, // Run E2E tests sequentially
  collectCoverageFrom: [], // Don't collect coverage for E2E tests
  globalSetup: '<rootDir>/../test/global-setup.ts',
  globalTeardown: '<rootDir>/../test/global-teardown.ts'
}; 