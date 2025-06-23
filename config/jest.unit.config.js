module.exports = {
  ...require('./jest.base.config.js'),
  displayName: 'Unit Tests',
  testMatch: ['**/test/unit/**/*.test.ts'],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/application/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts']
}; 