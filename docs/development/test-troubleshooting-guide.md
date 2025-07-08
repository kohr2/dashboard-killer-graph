# Test Troubleshooting Guide

## Common Issues & Solutions

### 1. Console-to-Logger Recursion
**Symptoms**: Tests hang indefinitely, stack overflow
**Fix**: Capture original console methods before patching
```typescript
const originalConsole = { ...console };
console.log = (message) => originalConsole.log(`[LEGACY] ${message}`);
```

### 2. Incomplete Mock Objects
**Symptoms**: "Cannot read property X of undefined" errors
**Fix**: Create complete mocks with all required properties
```typescript
const mockDataSource = {
  id: 'test-source',
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  fetch: jest.fn().mockReturnValue([{ body: 'test content' }]),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy' as const,
    lastCheck: new Date()
  })
};
```

### 3. AsyncIterable Issues
**Symptoms**: "next is not a function" errors
**Fix**: Use proper async iterator pattern
```typescript
const iterator = generator[Symbol.asyncIterator]();
const result = await iterator.next();
```

### 4. Missing Dependencies
**Symptoms**: Module not found errors
**Fix**: Install missing dependencies and create TypeScript declarations
```bash
npm install --save-dev axios-mock-adapter
```

### 5. Enrichment Service Failures
**Symptoms**: Type errors with EnrichmentResult, mock call mismatches
**Fix**: Handle mixed return types
```typescript
interface IEnrichmentService {
  enrichOrganization(org: Organization): Promise<EnrichmentResult | GenericEntity | null | {}>;
}
```

### 6. Email Ingestion Hanging
**Symptoms**: Tests hang with no output
**Fix**: Test pipeline directly, don't import scripts
```typescript
import { IngestionPipeline } from '../pipeline/ingestion-pipeline';
// Test pipeline directly instead of importing script
```

### 7. Neo4j Connection Timeouts
**Symptoms**: E2E tests fail with "Connection acquisition timed out"
**Fix**: Restart Neo4j and use extended timeout
```bash
docker-compose -f docker-compose.neo4j.yml restart
npm test -- --testTimeout=300000 test/e2e/
```

### 8. Ontology Registration Issues
**Symptoms**: "register is not a function" errors
**Fix**: Create missing register.ts files
```typescript
export function register(): void {
  // Registration logic
}
```

## Quick Debug Commands

```bash
# Run single test with debug
npm test -- --testNamePattern="test name" --verbose

# Run specific test file
npm test src/path/to/test.ts

# Check TypeScript compilation
npx tsc --noEmit
```

## Mock Patterns

```typescript
// Function mock
const mockFn = jest.fn().mockResolvedValue(result);

// Async generator mock
const mockAsyncGenerator = {
  [Symbol.asyncIterator]: jest.fn().mockReturnValue({
    next: jest.fn()
      .mockResolvedValueOnce({ value: 'item1', done: false })
      .mockResolvedValueOnce({ value: undefined, done: true })
  })
};

// Reset mocks
beforeEach(() => jest.clearAllMocks());
```

## When to Seek Help

Contact the development team if:
- Tests consistently fail after following this guide
- New test patterns needed for unique scenarios
- Infrastructure issues persist (Neo4j, Docker, etc.)
- Performance issues with test execution 