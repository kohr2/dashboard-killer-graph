const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/**
 * Base Jest configuration shared between unit and e2e tests
 * This reduces duplication and ensures consistent behavior
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  
  // Root directories to search for tests
  roots: [
    '<rootDir>/src',
    '<rootDir>/test',
    '<rootDir>/scripts',
    '<rootDir>/ontologies'
  ],
  
  // Module name mapping for TypeScript path aliases
  moduleNameMapper: {
    // Source code aliases
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@ingestion/(.*)$': '<rootDir>/src/ingestion/$1',
    '^@mcp/(.*)$': '<rootDir>/src/mcp/$1',
    
    // Ontology aliases
    '^@procurement/(.*)$': '<rootDir>/ontologies/procurement/$1',
    '^@crm/(.*)$': '<rootDir>/ontologies/crm/$1',
    '^@financial/(.*)$': '<rootDir>/ontologies/financial/$1',
    '^ontologies/(.*)$': '<rootDir>/ontologies/$1',
    
    // Generated code aliases
    '^@generated/(.*)$': '<rootDir>/codegen/generated/$1',
    '^@codegen/generated/(.*)$': '<rootDir>/codegen/generated/$1',
  },

  // Module directories for resolution
  moduleDirectories: [
    'node_modules',
    'src',
    'scripts',
    'scripts/database'
  ],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'test/tsconfig.json',
      isolatedModules: true
    }]
  },

  // Global Jest configuration
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Reporters configuration
  reporters: ['default'],

  // Coverage configuration
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'scripts/**/*.ts',
    'ontologies/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],

  // File extensions to process
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Setup files
  setupFilesAfterEnv: [
    'jest-extended/all',
    './test/setup.ts'
  ],

  // Test file patterns (to be overridden by specific configs)
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/scripts/**/*.test.ts',
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/ontologies/**/*.test.ts'
  ],

  // Coverage thresholds (optional - can be enabled for CI)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Verbose output for debugging
  verbose: true,

  // Bail on first failure (useful for CI)
  bail: false,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true
}; 