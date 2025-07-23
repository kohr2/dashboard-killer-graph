# Jest Configuration Documentation

This document describes the refactored Jest configuration structure for the Dashboard Killer Graph project.

## 📁 Configuration Files

### **`jest.config.base.js`** - Base Configuration
Shared configuration used by all test types. Contains:
- TypeScript transformation settings
- Module name mapping for path aliases
- Coverage configuration
- Common test patterns
- Shared setup files

### **`jest.config.js`** - Main Configuration (Default)
Runs all tests with balanced settings:
- Unit and e2e tests
- 30-second timeout
- 70% coverage threshold
- Global setup/teardown for e2e tests

### **`jest.unit.config.js`** - Unit Test Configuration
Optimized for fast, isolated unit tests:
- 5-second timeout
- 80% coverage threshold
- No global setup/teardown
- Focused on isolated component testing

### **`jest.e2e.config.js`** - E2E Test Configuration
Optimized for integration and end-to-end tests:
- 60-second timeout
- 60% coverage threshold
- Global setup/teardown for external services
- Focused on complete workflow testing

## 🚀 Usage

### **Running Tests**

```bash
# Run all tests (default)
npm test

# Run unit tests only
npm run test:unit

# Run e2e tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run in CI mode
npm run test:ci
```

### **Configuration Selection**

```bash
# Use specific configuration
jest --config jest.unit.config.js
jest --config jest.e2e.config.js
jest --config jest.config.js
```

## 📊 Test Organization

### **Unit Tests**
- **Location**: `src/**/__tests__/` directories
- **Pattern**: `*.test.ts` files
- **Focus**: Individual functions and classes
- **Dependencies**: Mocked external services
- **Speed**: Fast execution (< 1 second per test)

### **E2E Tests**
- **Location**: `test/e2e/` directory
- **Pattern**: `*.test.ts` files
- **Focus**: Complete workflows and integrations
- **Dependencies**: Real external services
- **Speed**: Slower execution (may take several seconds)

### **Test Fixtures**
- **Location**: `ontologies/*/fixtures/` directories
- **Organization**: By ontology for better modularity
- **Types**: Email fixtures, dataset fixtures, mock data

## 🔧 Configuration Details

### **Base Configuration Features**

#### **TypeScript Support**
```javascript
preset: 'ts-jest',
testEnvironment: 'node',
```

#### **Path Aliases**
```javascript
moduleNameMapper: {
  '^@src/(.*)$': '<rootDir>/src/$1',
  '^@platform/(.*)$': '<rootDir>/src/platform/$1',
  '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  '^@ingestion/(.*)$': '<rootDir>/src/ingestion/$1',
  '^@ontologies/(.*)$': '<rootDir>/ontologies/$1',
}
```

#### **Coverage Configuration**
```javascript
coverageDirectory: 'coverage',
collectCoverageFrom: [
  'src/**/*.ts',
  'scripts/**/*.ts',
  'ontologies/**/*.ts',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!**/coverage/**',
  '!**/dist/**',
  '!**/build/**',
]
```

### **Unit Test Configuration**

#### **Optimized for Speed**
```javascript
testTimeout: 5000,
globalSetup: undefined,
globalTeardown: undefined,
```

#### **Focused Test Patterns**
```javascript
testMatch: [
  '<rootDir>/src/**/__tests__/**/*.test.ts',
  '<rootDir>/src/**/*.test.ts',
  '<rootDir>/scripts/**/__tests__/**/*.test.ts',
  '<rootDir>/ontologies/**/__tests__/**/*.test.ts',
]
```

#### **Higher Coverage Threshold**
```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### **E2E Test Configuration**

#### **Extended Timeouts**
```javascript
testTimeout: 60000,
globalSetup: '<rootDir>/test/global-setup.ts',
globalTeardown: '<rootDir>/test/global-teardown.ts',
```

#### **Integration Test Patterns**
```javascript
testMatch: [
  '<rootDir>/test/e2e/**/*.test.ts',
  '<rootDir>/test/integration/**/*.test.ts',
  '<rootDir>/test/performance/**/*.test.ts',
]
```

#### **Realistic Coverage Threshold**
```javascript
coverageThreshold: {
  global: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60
  }
}
```

## 🧪 Test Setup Files

### **`test/setup.ts`** - Base Test Setup
Common setup for all test types:
- Environment configuration
- Global test utilities
- Shared mocks and stubs

### **`test/e2e-setup.ts`** - E2E Test Setup
Additional setup for end-to-end tests:
- Database connection setup
- External service configuration
- Test data preparation

### **`test/global-setup.ts`** - Global Setup
Setup that runs once before all tests:
- Database initialization
- Service startup
- Environment preparation

### **`test/global-teardown.ts`** - Global Teardown
Cleanup that runs once after all tests:
- Database cleanup
- Service shutdown
- Resource cleanup

## 📈 Coverage Configuration

### **Coverage Thresholds**

| Test Type | Branches | Functions | Lines | Statements |
|-----------|----------|-----------|-------|------------|
| Unit Tests | 80% | 80% | 80% | 80% |
| E2E Tests | 60% | 60% | 60% | 60% |
| All Tests | 70% | 70% | 70% | 70% |

### **Coverage Exclusions**
```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  'scripts/**/*.ts',
  'ontologies/**/*.ts',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!**/coverage/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/__tests__/**',
  '!**/*.test.ts',
  '!**/*.spec.ts',
]
```

## 🔍 Debugging Tests

### **Verbose Output**
```bash
npm run test:unit -- --verbose
npm run test:e2e -- --verbose
```

### **Debug Mode**
```bash
npm run test:unit -- --detectOpenHandles
npm run test:e2e -- --detectOpenHandles
```

### **Specific Test Files**
```bash
npm run test:unit -- src/platform/chat/__tests__/chat.service.test.ts
npm run test:e2e -- test/e2e/procurement-entity-name-extraction.test.ts
```

### **Test Patterns**
```bash
npm run test:unit -- --testNamePattern="should extract entities"
npm run test:e2e -- --testPathPattern="procurement"
```

## 🚀 Performance Optimization

### **Parallel Execution**
```javascript
maxWorkers: '50%',
```

### **Memory Management**
```javascript
forceExit: true,
detectOpenHandles: true,
```

### **Caching**
```javascript
cache: true,
cacheDirectory: '<rootDir>/node_modules/.cache/jest',
```

## 🔧 Customization

### **Environment-Specific Configuration**
```bash
# Development
NODE_ENV=development npm run test:unit

# Production
NODE_ENV=production npm run test:e2e

# CI/CD
CI=true npm run test:ci
```

### **Custom Test Patterns**
```bash
# Test specific directories
npm run test:unit -- --testPathPattern="src/platform"

# Test specific file types
npm run test:unit -- --testMatch="**/*.integration.test.ts"

# Exclude patterns
npm run test:unit -- --testPathIgnorePatterns="node_modules|dist"
```

## 📋 Best Practices

### **Test Organization**
- Place unit tests in `__tests__` directories next to source files
- Place e2e tests in `test/e2e` directory
- Use descriptive test names and organization
- Group related tests in `describe` blocks

### **Mocking Strategy**
- Mock external dependencies (APIs, databases, file system)
- Use `jest.fn()` for function mocks
- Use `jest.spyOn()` for method spies
- Create reusable mock factories

### **Coverage Strategy**
- Aim for high unit test coverage (80%+)
- Accept lower e2e test coverage (60%+)
- Focus on critical business logic
- Don't chase 100% coverage at the expense of test quality

### **Performance Considerations**
- Keep unit tests fast (< 1 second per test)
- Use appropriate timeouts for e2e tests
- Clean up resources in `afterEach` and `afterAll`
- Use `beforeAll` for expensive setup operations

## 🔄 Migration from Legacy Configuration

### **Changes Made**
- **Consolidated**: Multiple config files into base + specialized configs
- **Simplified**: Removed redundant settings and plugins
- **Organized**: Better separation of concerns
- **Optimized**: Improved performance and coverage settings

### **Backward Compatibility**
- All existing test files continue to work
- Test patterns and organization remain the same
- Coverage thresholds may need adjustment
- Some test timeouts may need updating

## 🆘 Troubleshooting

### **Common Issues**

#### **Module Resolution Errors**
```bash
# Check TypeScript configuration
npm run type-check

# Verify path aliases
npx tsc --noEmit --project tsconfig.json
```

#### **Timeout Issues**
```bash
# Increase timeout for specific tests
jest.setTimeout(10000);

# Use appropriate configuration
npm run test:e2e  # For integration tests
```

#### **Coverage Issues**
```bash
# Check coverage exclusions
npm run test:coverage -- --verbose

# Verify source files are included
npm run test:coverage -- --collectCoverageFrom="src/**/*.ts"
```

### **Debug Commands**
```bash
# Run with debug output
DEBUG=* npm run test:unit

# Check Jest configuration
npx jest --showConfig

# Validate configuration
npx jest --validate
```

The refactored Jest configuration provides a clean, maintainable, and performant testing setup for the Dashboard Killer Graph project! 