const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  roots: ['<rootDir>/src', '<rootDir>/test', '<rootDir>/scripts', '<rootDir>/ontologies'],
  
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@crm/(.*)$': '<rootDir>/ontologies/crm/$1',
    '^@financial/(.*)$': '<rootDir>/ontologies/financial/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@mcp/(.*)$': '<rootDir>/src/mcp/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@procurement/(.*)$': '<rootDir>/ontologies/procurement/$1',
    '^@generated/(.*)$': '<rootDir>/codegen/generated/$1',
    '^@ingestion/(.*)$': '<rootDir>/src/ingestion/$1',
    '^@codegen/generated/(.*)$': '<rootDir>/codegen/generated/$1',
    '^ontologies/(.*)$': '<rootDir>/ontologies/$1',
  },

  moduleDirectories: ["node_modules", "src", "scripts", "scripts/database"],

  // No global setup for unit tests - they don't need external services
  setupFilesAfterEnv: ['jest-extended/all', './test/setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/scripts/**/*.test.ts', '<rootDir>/test/**/*.test.ts', '<rootDir>/ontologies/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'test/tsconfig.json'
    }]
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
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