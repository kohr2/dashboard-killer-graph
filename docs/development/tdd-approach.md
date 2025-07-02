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

## 📁 Test Structure

### Directory Organization

```
src/
├── ontologies/
│   ├── crm/
│   │   ├── __tests__/
│   │   │   ├── plugin-loading.test.ts
│   │   │   └── integration/
│   │   │       └── crm-entities.test.ts
│   │   └── crm.plugin.ts
│   └── financial/
│       ├── __tests__/
│       │   └── plugin-loading.test.ts
│       └── financial.plugin.ts
├── platform/
│   ├── ontology/
│   │   ├── __tests__/
│   │   │   ├── ontology-service.test.ts
│   │   │   └── plugin-loading.test.ts
│   │   └── ontology.service.ts
│   └── reasoning/
│       ├── __tests__/
│       │   └── reasoning-integration.test.ts
│       └── ontology-driven-reasoning.service.ts
└── ingestion/
    ├── sources/
    │   └── email/
    │       ├── processors/
    │       │   ├── __tests__/
    │       │   │   ├── attachment-processor.test.ts
    │       │   │   └── email-processor.test.ts
    │       │   └── attachment-processor.ts
    │       └── __tests__/
    │           └── email-source.test.ts
    └── __tests__/
        └── integration/
            └── email-pipeline.test.ts
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
```

## 🧪 Test Categories

### 1. Unit Tests

**Purpose**: Test individual components in isolation

```typescript
// src/ontologies/crm/__tests__/plugin-loading.test.ts
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
// src/ingestion/__tests__/integration/email-pipeline.test.ts
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
// src/ontologies/__tests__/plugin-loading.test.ts
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

**Step 3: Refactor (if needed)**

### Example 2: Adding Core Ontology Method

**Step 1: Write failing test**

```typescript
// src/platform/ontology/__tests__/ontology-service.test.ts
describe('OntologyService', () => {
  it('should return schema representation for core entities', () => {
    const ontologyService = new OntologyService();
    ontologyService.loadPlugin(corePlugin);
    
    const schema = ontologyService.getSchemaRepresentation();
    
    expect(schema.entities.Communication).toBeDefined();
    expect(schema.entities.Communication.parent).toBe('Thing');
    expect(schema.relationships.CONTAINS_ENTITY).toBeDefined();
  });
});
```

**Step 2: Make test pass**

```typescript
// src/platform/ontology/ontology.service.ts
public getSchemaRepresentation(): OntologySchema {
  return {
    entities: this.entitySchemas,
    relationships: this.relationshipSchemas
  };
}
```

**Step 3: Refactor (if needed)**

## 🎯 Testing Best Practices

### 1. Mock External Dependencies

```typescript
// Mock NLP service calls
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('EntityExtractor', () => {
  beforeEach(() => {
    mockAxios.post.mockResolvedValue({
      data: {
        entities: [
          { type: 'Organization', value: 'Acme Corp' }
        ]
      }
    });
  });
});
```

### 2. Use Descriptive Test Names

```typescript
// Good
it('should extract organization entities from PDF text', () => {
  // Test implementation
});

// Bad
it('should work', () => {
  // Test implementation
});
```

### 3. Test Edge Cases

```typescript
describe('AttachmentProcessor', () => {
  it('should handle empty files gracefully', () => {
    // Test empty file handling
  });
  
  it('should handle unsupported file types', () => {
    // Test unsupported format handling
  });
  
  it('should handle corrupted PDF files', () => {
    // Test error handling
  });
});
```

### 4. Use Test Data Factories

```typescript
// test/factories/email.factory.ts
export const createTestEmail = (overrides = {}) => ({
  id: 'test-email-1',
  subject: 'Test Email',
  sender: 'test@example.com',
  body: 'This is a test email body.',
  attachments: [],
  ...overrides
});

// In tests
const testEmail = createTestEmail({
  attachments: [createTestAttachment({ type: 'pdf' })]
});
```

## 🚀 Running Tests

### Test Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/ontologies/crm/__tests__/plugin-loading.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm test -- src/**/__tests__/integration/

# Run unit tests only
npm test -- src/**/__tests__/*.test.ts
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 📊 Test Coverage Requirements

### Minimum Coverage Thresholds

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Exclusions

- Test files (`**/__tests__/**`)
- Type definition files (`*.d.ts`)
- Configuration files
- Build artifacts

## 🔍 Debugging Tests

### Debug Mode

```bash
# Run tests with debug logging
DEBUG=* npm test

# Run specific test with debug
DEBUG=* npm test -- --testNamePattern="should extract entities"
```

### Test Isolation

```typescript
describe('Database Tests', () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase();
  });
  
  afterEach(async () => {
    // Clean up after each test
    await cleanupTestDatabase();
  });
});
```

## 📝 Documentation

### Test Documentation

Each test should be self-documenting, but complex test scenarios should include comments:

```typescript
describe('Complex Business Logic', () => {
  it('should handle multi-step entity extraction workflow', () => {
    // Given: Email with PDF attachment containing financial data
    const email = createTestEmailWithFinancialAttachment();
    
    // When: Processing the email through the pipeline
    const result = await emailProcessor.process(email);
    
    // Then: Financial entities should be extracted and linked to Communication
    expect(result.entities).toContainEqual({
      type: 'MonetaryAmount',
      value: '$1.5M',
      source: 'attachment-pdf'
    });
    
    expect(result.relationships).toContainEqual({
      source: result.communication.id,
      target: '$1.5M',
      type: 'CONTAINS_ENTITY'
    });
  });
});
```

## 🤝 Code Review Checklist

When reviewing code, ensure:

- [ ] **Tests were written first** (TDD approach)
- [ ] **All new functionality is tested**
- [ ] **Edge cases are covered**
- [ ] **Integration tests exist for complex workflows**
- [ ] **Test names are descriptive**
- [ ] **Mocks are used for external dependencies**
- [ ] **Test coverage meets thresholds**
- [ ] **Tests are fast and isolated**

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing](https://jestjs.io/docs/getting-started#using-typescript)
- [TDD Best Practices](https://www.agilealliance.org/glossary/tdd/)
- [Test-Driven Development by Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530) 