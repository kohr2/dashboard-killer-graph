# Test Suite Documentation

## Current Status
- **Tests**: 302/306 passing (98.7%)
- **Suites**: 60/62 passing (96.8%)
- **Runtime**: ~103 seconds
- **Issues**: 2 E2E suites failing (Neo4j timeouts)

## Recent Fixes (2024)
1. Console-to-Logger recursion ✅
2. Enrichment services architecture ✅
3. Missing dependencies ✅
4. Mock object completeness ✅
5. Email ingestion pipeline ✅
6. Ontology registration ✅

## Test Types

### Unit Tests (`src/**/__tests__/`)
Test individual components in isolation.
```typescript
describe('EntityExtractor', () => {
  it('should extract organizations', () => {
    const entities = extractor.extract('Apple Inc. is a company');
    expect(entities[0].type).toBe('Organization');
  });
});
```

### Integration Tests (`**/integration/`)
Test component interactions.
```typescript
describe('Email Processing Integration', () => {
  it('should process email through pipeline', async () => {
    const result = await pipeline.process(emailSource);
    expect(result.success).toBe(true);
  });
});
```

### Plugin Tests (`ontologies/*/__tests__/`)
Test ontology plugin loading.
```typescript
describe('Financial Plugin', () => {
  it('should load Deal entity', () => {
    expect(financialPlugin.entitySchemas.Deal).toBeDefined();
  });
});
```

### E2E Tests (`test/e2e/`)
Test complete workflows (currently failing due to Neo4j timeouts).

## Key Fixes

### Console-to-Logger Recursion
Fixed infinite loops by capturing original console methods before patching.

### Enrichment Services
Updated interface to support mixed return types (EnrichmentResult | GenericEntity | null | {}).

### Missing Dependencies
Added axios-mock-adapter and TypeScript declarations.

### Mock Objects
Enhanced all mocks with complete interface implementations.

### Email Ingestion
Fixed hanging tests by testing pipeline directly instead of script imports.

### Ontology Registration
Created missing register.ts files for FIBO and procurement ontologies.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern=enrichment

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch

# Debug single test
npm test -- --testNamePattern="test name" --verbose
```

## Common Issues

### E2E Test Failures
Neo4j connection timeouts in E2E tests. Known issue, not blocking core functionality.

**Fix**: Restart Neo4j and run with extended timeout:
```bash
docker-compose -f docker-compose.neo4j.yml restart
npm test -- --testTimeout=300000 test/e2e/
```

### Mock Patterns
```typescript
// Complete mock with all required properties
const mockDataSource = {
  id: 'test-source',
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  fetch: jest.fn().mockImplementation(async function* () {
    yield { id: '1', content: 'test data' };
  }),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy' as const,
    lastCheck: new Date()
  })
};
```

### Async Testing
```typescript
// Test async iterables correctly
const iterator = source.fetch()[Symbol.asyncIterator]();
const result = await iterator.next();
expect(result.value).toBeDefined();
```

## Best Practices

- Follow TDD Red-Green-Refactor cycle
- Create complete mock objects with all properties
- Use descriptive test names explaining behavior
- Test both success and error conditions
- Reset mocks between tests with `beforeEach(() => jest.clearAllMocks())`

## Performance
- **Coverage**: 59.89% statements, 42.94% branches
- **Execution**: ~103 seconds for full suite
- **Optimization**: Mock external services, use test doubles for expensive operations 