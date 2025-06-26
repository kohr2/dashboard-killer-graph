const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  roots: ['<rootDir>'],
  
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),

  moduleDirectories: ["node_modules", "src"],

  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts', 'jest-extended/all'],
  testMatch: [
      "**/test/unit/**/*.test.ts",
      "**/test/integration/**/*.test.ts"
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'test/tsconfig.json'
    }
  }
};