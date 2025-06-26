const { compilerOptions } = require('./config/tsconfig.base.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  roots: ['<rootDir>'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@crm/(.*)$': '<rootDir>/src/extensions/crm/$1',
    '^@financial/(.*)$': '<rootDir>/src/extensions/financial/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testMatch: [
      "**/test/unit/**/*.test.ts"
  ],
}; 