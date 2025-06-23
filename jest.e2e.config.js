module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run E2E tests sequentially
  verbose: true,
}; 