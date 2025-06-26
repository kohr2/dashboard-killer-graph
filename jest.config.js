const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.test.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  roots: ['<rootDir>'],
  
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),

  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testMatch: [
      "**/test/unit/**/*.test.ts",
      "**/test/integration/**/*.test.ts"
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  }
};