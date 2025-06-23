module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../src', '<rootDir>/../test'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@domain/(.*)$': '<rootDir>/../src/domain/$1',
    '^@application/(.*)$': '<rootDir>/../src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/../src/infrastructure/$1',
    '^@interface/(.*)$': '<rootDir>/../src/interface/$1',
    '^@shared/(.*)$': '<rootDir>/../src/shared/$1',
    '^@test/(.*)$': '<rootDir>/../test/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  errorOnDeprecated: true,
  testTimeout: 10000
}; 