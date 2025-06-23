module.exports = {
  ...require('./jest.base.config.js'),
  projects: [
    '<rootDir>/config/jest.unit.config.js',
    '<rootDir>/config/jest.integration.config.js',
    '<rootDir>/config/jest.e2e.config.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}; 