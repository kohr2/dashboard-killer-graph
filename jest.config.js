const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '^@crm-core/(.*)$': '<rootDir>/src/crm-core/$1',
    '^@financial/(.*)$': '<rootDir>/src/extensions/financial/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!test/**/*.ts',
    '!src/crm-core/domain/ontology/o-cream-v2.ts',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
};