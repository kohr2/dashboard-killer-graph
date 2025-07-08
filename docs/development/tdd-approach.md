# Test-Driven Development (TDD) Approach

This document outlines the strict TDD methodology used in this project, ensuring high code quality, comprehensive test coverage, and maintainable architecture.

## 🎯 TDD Principles

### The Red-Green-Refactor Cycle

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve the code while keeping tests green

### Core Rules

- **Never write production code without a failing test**
- **Write the simplest possible code to make tests pass**
- **Refactor only when tests are green**
- **Each test should verify a single behavior**
- **Tests should be fast, isolated, and repeatable**

## 📊 Current Test Status

### Test Coverage Summary
- **302/306 tests passing** (98.7% success rate)
- **60/62 test suites passing** (96.8% success rate)
- **Comprehensive mock objects** for external dependencies
- **Integration tests** for email processing pipeline
- **Unit tests** for all services and utilities

### Recent Major Improvements (2024)
- **Fixed 6 test suites** and 9+ individual tests
- **Resolved console-logger recursion** issues
- **Enhanced enrichment services** architecture
- **Added missing dependencies** and infrastructure
- **Improved mock object completeness**
- **Fixed email ingestion pipeline** tests

### Test Categories
- **Unit Tests**: Individual component testing (45 suites)
- **Integration Tests**: Component interaction testing (13 suites)
- **Plugin Tests**: Ontology plugin validation (2 suites)
- **E2E Tests**: End-to-end processing validation (2 suites - infrastructure issues)

## 📁 Test Structure

### Current Directory Organization

```
src/
├── ontologies/
│   ├── crm/
│   │   ├── __tests__/
│   │   │   └── ontology-loading.test.ts
│   │   └── crm.plugin.ts
│   └── financial/
│       ├── __tests__/
│       │   ├── enhanced-entity-extraction.test.ts
│       │   ├── integration/
│       │   │   ├── gotham-entity-linking.test.ts
│       │   │   └── multi-label-ingestion.test.ts
│       │   └── plugin-loading.test.ts
│       └── financial.plugin.ts
├── platform/
│   ├── ontology/
│   │   ├── __tests__/
│   │   │   ├── ontology-service.test.ts
│   │   │   └── plugin-loading.test.ts
│   │   └── ontology.service.ts
│   ├── processing/
│   │   ├── __tests__/
│   │   │   ├── advanced-graph.service.test.ts
│   │   │   └── enhanced-entity-extraction.test.ts
│   │   └── advanced-graph.service.ts
│   ├── enrichment/
│   │   ├── test/
│   │   │   ├── integration/
│   │   │   │   └── edgar-enrichment.service.integration.test.ts
│   │   │   └── unit/
│   │   │       ├── edgar-enrichment.service.test.ts
│   │   │       ├── enrichment-contract.test.ts
│   │   │       ├── enrichment-orchestrator.service.test.ts
│   │   │       └── salesforce-enrichment.service.test.ts
│   │   └── enrichment-orchestrator.service.ts
│   └── chat/
│       ├── __tests__/
│       │   ├── integration/
│       │   │   ├── chat-api.test.ts
│       │   │   ├── chat-system-integration.test.ts
│       │   │   └── deal-chat-queries.test.ts
│       │   └── application/
│       │       └── services/
│       │           └── __tests__/
│       │               └── chat.service.test.ts
│       └── chat.service.ts
└── ingestion/
    ├── pipeline/
    │   ├── __tests__/
    │   │   ├── ingestion-pipeline-extraction.test.ts
    │   │   └── ingestion-pipeline.test.ts
    │   └── ingestion-pipeline.ts
    ├── sources/
    │   ├── __tests__/
    │   │   └── email-source.test.ts
    │   └── email-source.ts
    ├── services/
    │   ├── __tests__/
    │   │   └── email-ingestion.service.test.ts
    │   └── email-ingestion.service.ts
    └── tests/
        ├── application/
        │   └── services/
        │       └── email-ingestion.service.test.ts
        ├── email-ingestion-script.test.ts
        └── email-pipeline.test.ts

scripts/
└── pipeline/
    └── __tests__/
        ├── generic-ingestion-pipeline.test.ts
        ├── relationship-ingestion.test.ts
        └── separate-property-entities.test.ts

test/
├── fixtures/
│   └── emails/          # 28 test email files
├── setup.ts
└── global-setup.ts
```

### Test Naming Conventions

```typescript
// Unit tests: [component-name].test.ts
describe('AttachmentProcessor', () => {
  describe('processSingleAttachment', () => {
    it('should extract text from PDF files', () => {
      // Test implementation
    });
    
    it('should handle corrupted files gracefully', () => {
      // Test implementation
    });
  });
});

// Integration tests: [feature]-integration.test.ts
describe('Email Pipeline Integration', () => {
  it('should process email with attachments end-to-end', () => {
    // Integration test
  });
});

// Plugin tests: plugin-loading.test.ts
describe('CRM Plugin Loading', () => {
  it('should load CRM ontology correctly', () => {
    // Plugin loading test
  });
});

// Pipeline tests: [pipeline-name].test.ts
describe('Generic Ingestion Pipeline', () => {
  it('should process entities and relationships correctly', () => {
    // Pipeline test
  });
});
```

## 🧪 Test Categories

### 1. Unit Tests

**Purpose**: Test individual components in isolation

```typescript
// src/ontologies/crm/__tests__/ontology-loading.test.ts
describe('CRM Plugin', () => {
  it('should define Contact entity with required properties', () => {
    const plugin = crmPlugin;
    
    expect(plugin.entitySchemas.Contact).toBeDefined();
    expect(plugin.entitySchemas.Contact.keyProperties).toContain('id');
    expect(plugin.entitySchemas.Contact.keyProperties).toContain('email');
  });
  
  it('should define relationships to core Communication entity', () => {
    const plugin = crmPlugin;
    
    expect(plugin.relationshipSchemas.PARTICIPANT_IN).toBeDefined();
    expect(plugin.relationshipSchemas.PARTICIPANT_IN.range).toBe('Communication');
  });
});
```

### 2. Integration Tests

**Purpose**: Test component interactions and data flow

```typescript
// src/ingestion/tests/email-pipeline.test.ts
describe('Email Pipeline Integration', () => {
  it('should process email with attachments and link to Communication entity', async () => {
    const emailProcessor = new EmailProcessor();
    const result = await emailProcessor.processEmlFileWithAttachments(testEmailPath);
    
    expect(result.communication).toBeDefined();
    expect(result.communication.type).toBe('email');
    expect(result.entities).toHaveLength(2);
    expect(result.relationships).toContainEqual({
      source: result.communication.id,
      target: 'Acme Corp',
      type: 'CONTAINS_ENTITY'
    });
  });
});
```

### 3. Plugin Loading Tests

**Purpose**: Verify ontology plugins load correctly

```typescript
// src/platform/ontology/__tests__/plugin-loading.test.ts
describe('Ontology Plugin Loading', () => {
  it('should load core ontology with Communication entity', () => {
    const ontologyService = new OntologyService();
    ontologyService.loadPlugin(corePlugin);
    
    const communicationSchema = ontologyService.getEntitySchema('Communication');
    expect(communicationSchema).toBeDefined();
    expect(communicationSchema.parent).toBe('Thing');
    expect(communicationSchema.keyProperties).toContain('id');
  });
  
  it('should load all enabled plugins from configuration', () => {
    const enabledPlugins = Object.entries(ONTOLOGY_PLUGINS_CONFIG)
      .filter(([_, config]) => config.enabled)
      .map(([name, _]) => name);
    
    expect(enabledPlugins).toContain('core');
    expect(enabledPlugins).toContain('crm');
    expect(enabledPlugins).toContain('financial');
  });
});
```

### 4. Pipeline Tests

**Purpose**: Test end-to-end processing pipelines

```typescript
// scripts/pipeline/__tests__/generic-ingestion-pipeline.test.ts
describe('Generic Ingestion Pipeline', () => {
  it('should process entities and relationships correctly', async () => {
    const pipeline = new GenericIngestionPipeline(mockEntityExtractor, mockOntologyService);
    const result = await pipeline.run(mockInput);
    
    expect(result.entities).toBeDefined();
    expect(result.relationships).toBeDefined();
    expect(result.communication).toBeDefined();
  });
});
```

## 🔧 Mock Object Standards

### Comprehensive Mock Objects

All mock objects must include all required properties and methods:

```typescript
// DataSource Mock Example
const mockDataSource = {
  id: 'test-source',
  type: SourceType.DOCUMENT,
  config: { name: 'test-source', enabled: true },
  connect: jest.fn(),
  disconnect: jest.fn(),
  fetch: jest.fn().mockReturnValue([{ body: 'test content' }]),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy' as const,
    lastCheck: new Date(),
    message: 'Mock source is healthy'
  })
};

// Service Mock Example
const mockOntologyService = {
  getAllOntologies: jest.fn(),
  getEntitySchema: jest.fn(),
  getAllEntityTypes: jest.fn(),
  getAllRelationshipTypes: jest.fn(),
  getPropertyEntityTypes: jest.fn(),
  validateEntity: jest.fn(),
  validateRelationship: jest.fn(),
  getRelationshipSchema: jest.fn(),
  applyOntologyConfiguration: jest.fn(),
  getOntologyConfig: jest.fn()
};
```

### AsyncIterable Handling

For async iterators, use proper patterns:

```typescript
// Correct AsyncIterable handling
describe('Email Source', () => {
  it('should handle async iteration correctly', async () => {
    const source = new EmailSource();
    const fetchGenerator = source.fetch();
    const iterator = fetchGenerator[Symbol.asyncIterator]();
    
    await expect(iterator.next()).rejects.toThrow('Expected error');
  });
});
```

## 🔧 TDD Workflow Examples

### Example 1: Adding a New Entity Property

**Step 1: Write failing test**

```typescript
// src/ontologies/crm/__tests__/contact-entity.test.ts
describe('Contact Entity', () => {
  it('should have phoneNumber property', () => {
    const contactSchema = crmPlugin.entitySchemas.Contact;
    
    expect(contactSchema.properties.phoneNumber).toBeDefined();
    expect(contactSchema.properties.phoneNumber).toBe('string');
  });
});
```

**Step 2: Make test pass**

```typescript
// src/ontologies/crm/crm.plugin.ts
entitySchemas: {
  Contact: {
    // ... existing properties
    properties: {
      // ... existing properties
      phoneNumber: 'string'
    }
  }
}
```

**Step 3: Refactor**

```typescript
// Add validation, documentation, etc.
```

### Example 2: Adding a New Service Method

**Step 1: Write failing test**

```typescript
// src/platform/processing/__tests__/advanced-graph.service.test.ts
describe('AdvancedGraphService', () => {
  it('should validate entity relationships', () => {
    const service = new AdvancedGraphService();
    const entity = { type: 'Contact', properties: { name: 'John' } };
    
    const result = service.validateEntity(entity);
    expect(result.isValid).toBe(true);
  });
});
```

**Step 2: Make test pass**

```typescript
// src/platform/processing/advanced-graph.service.ts
validateEntity(entity: any) {
  return { isValid: true };
}
```

**Step 3: Refactor**

```typescript
// Add proper validation logic
validateEntity(entity: any) {
  // Implement actual validation
  return { isValid: true, errors: [] };
}
```

## 🚀 Running Tests

### Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=email
npm test -- --testPathPattern=ontology
npm test -- --testPathPattern=pipeline

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/scripts', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts'
};
```

## 📈 Test Quality Metrics

### Current Metrics
- **Test Coverage**: 59.89% statements, 42.94% branches
- **Test Execution Time**: ~36 seconds for full suite
- **Test Reliability**: 99.6% pass rate
- **Mock Coverage**: 100% of external dependencies

### Quality Standards
- **Unit Tests**: Must cover all public methods
- **Integration Tests**: Must cover critical data flows
- **Mock Objects**: Must implement complete interfaces
- **Test Isolation**: No shared state between tests
- **Async Handling**: Proper async/await patterns

## 🔍 Debugging Tests

### Common Issues and Solutions

#### 1. Mock Object Issues
```typescript
// Problem: Missing properties in mock
const mockService = { method: jest.fn() };

// Solution: Complete interface implementation
const mockService = {
  method: jest.fn(),
  property: 'value',
  asyncMethod: jest.fn().mockResolvedValue(result)
};
```

#### 2. AsyncIterable Issues
```typescript
// Problem: Direct .next() call
await expect(generator.next()).rejects.toThrow();

// Solution: Use proper iterator
const iterator = generator[Symbol.asyncIterator]();
await expect(iterator.next()).rejects.toThrow();
```

#### 3. TypeScript Issues
```typescript
// Problem: Type conflicts
export class Date { } // Conflicts with built-in Date

// Solution: Use different names
export class FinancialDate { }
// Or remove entirely and use string/number
```

## 📚 Best Practices

### Test Organization
1. **Group related tests** in describe blocks
2. **Use descriptive test names** that explain the behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests focused** on single behavior
5. **Use proper setup and teardown**

### Mock Management
1. **Create comprehensive mocks** with all required properties
2. **Use jest.fn()** for function mocks
3. **Reset mocks** between tests
4. **Verify mock calls** when testing interactions
5. **Use mock factories** for complex objects

### Async Testing
1. **Use async/await** consistently
2. **Handle AsyncIterable** properly
3. **Test error conditions** with proper error handling
4. **Use proper timeouts** for long-running operations
5. **Clean up resources** in teardown

## 🔗 Related Documentation

- [Date/Time Entity Removal](../fixes/date-time-entity-removal.md)
- [Processing Migration Summary](processing-migration-summary.md)
- [Ontology Plugin Architecture](../architecture/ontology-plugin-architecture.md)
- [Entity Extraction Guide](../architecture/entity-extraction-guide.md) 