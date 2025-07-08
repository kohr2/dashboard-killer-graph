# Test Strategy

## Core Principles
- **Test-Driven Development**: Red-Green-Refactor cycle
- **Ontology Agnostic**: Tests work across multiple ontologies
- **80% Coverage**: Minimum for new code
- **98%+ Success Rate**: Quality gate for tests

## Test Pyramid

### Unit Tests (70%) - `src/**/__tests__/`
Test individual components in isolation.
```typescript
describe('EntityExtractor', () => {
  it('should extract organizations', () => {
    const entities = extractor.extract('Apple Inc.');
    expect(entities[0].type).toBe('Organization');
  });
});
```

### Integration Tests (20%) - `**/integration/`
Test component interactions.
```typescript
describe('Email Processing', () => {
  it('should process through pipeline', async () => {
    const result = await pipeline.process(emailSource);
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests (10%) - `test/e2e/`
Test complete workflows.

## Mock Standards

All mocks must implement complete interfaces:
```typescript
const mockDataSource = {
  id: 'test-source',
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  fetch: jest.fn().mockImplementation(async function* () {
    yield { id: '1', content: 'test' };
  }),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy' as const,
    lastCheck: new Date()
  })
};
```

## Test Categories

### Ontology Tests (`ontologies/*/__tests__/`)
```typescript
describe('Financial Plugin', () => {
  it('should load Deal entity', () => {
    expect(financialPlugin.entitySchemas.Deal).toBeDefined();
  });
});
```

### Ingestion Tests (`src/ingestion/**/__tests__/`)
```typescript
describe('EmailSource', () => {
  it('should fetch emails', async () => {
    const emails = [];
    for await (const email of source.fetch()) {
      emails.push(email);
    }
    expect(emails.length).toBeGreaterThan(0);
  });
});
```

### Processing Tests (`src/platform/processing/**/__tests__/`)
```typescript
describe('EntityExtractor', () => {
  it('should extract with confidence scores', () => {
    const entities = extractor.extract(text);
    entities.forEach(entity => {
      expect(entity.confidence).toBeGreaterThan(0.5);
    });
  });
});
```

### Chat Tests (`src/platform/chat/**/__tests__/`)
```typescript
describe('QueryTranslator', () => {
  it('should translate natural language', () => {
    const query = translator.translate('Show deals with Apple');
    expect(query.entityTypes).toContain('Deal');
  });
});
```

## Commands

```bash
# Run all tests
npm test

# Run specific pattern
npm test -- --testPathPattern=enrichment

# Run with coverage
npm run test:coverage

# Debug single test
npm test -- --testNamePattern="test name" --verbose
```

## Best Practices

- Follow Red-Green-Refactor cycle
- Create complete mock objects
- Use descriptive test names
- Test success and error paths
- Reset mocks: `beforeEach(() => jest.clearAllMocks())`
- Use fixtures for consistent test data
- Mock external services completely

## Performance Targets

- **Full Suite**: < 120 seconds
- **Unit Tests**: < 10ms per test
- **Integration Tests**: < 100ms per test
- **E2E Tests**: < 30s per test

## CI/CD Integration

```yaml
# Pre-commit
npm run test:unit
npm run lint
npm run type-check

# CI Pipeline
npm run test:unit
npm run test:integration
npm run test:e2e
``` 