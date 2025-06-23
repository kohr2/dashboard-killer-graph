// Jest configuration - references main config in config directory
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true
    }],
  },
  globals: {
    'ts-jest': {
      isolatedModules: true,
      skipLibCheck: true
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@crm-core/(.*)$': '<rootDir>/src/crm-core/$1',
    '^@financial/(.*)$': '<rootDir>/src/extensions/financial/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: false,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000
}; 