const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@crm/(.*)$': '<rootDir>/src/ontologies/crm/$1',
    '^@financial/(.*)$': '<rootDir>/src/ontologies/financial/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@mcp/(.*)$': '<rootDir>/src/mcp/$1',
  },

  moduleDirectories: ["node_modules", "src", "scripts", "scripts/database"],

  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts', 'jest-extended/all', './test/setup.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/test/e2e/**/*.test.ts',
    '<rootDir>/test/integration/**/*.test.ts'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'test/tsconfig.json'
    }
  },
  testTimeout: 30000,
  reporters: ['default'],
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};