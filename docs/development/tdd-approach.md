# 🧪 Test-Driven Development Approach

## 🎯 TDD Philosophy

Our extensible CRM platform is built using **Test-Driven Development (TDD)** with the **Red-Green-Refactor** cycle for every component.

> **"Write tests first, then make them pass, then make them better."**

This approach ensures high code quality, comprehensive test coverage, and maintainable architecture across all modules.

## 🔄 Red-Green-Refactor Cycle

### 🔴 RED: Write Failing Test
```typescript
// 1. Write a failing test first
describe('Contact Entity', () => {
  it('should create contact with valid email', () => {
    const contact = new Contact({
      name: 'John Doe',
      email: 'john@example.com'
    });
    
    expect(contact.getEmail()).toBe('john@example.com');
    // This will FAIL because Contact class doesn't exist yet
  });
});
```

### 🟢 GREEN: Make Test Pass
```typescript
// 2. Write minimal code to make test pass
export class Contact {
  constructor(private data: { name: string; email: string }) {}
  
  getEmail(): string {
    return this.data.email;
  }
}
// Test now PASSES
```

### 🔄 REFACTOR: Improve Code Quality
```typescript
// 3. Refactor while keeping tests green
export class Contact {
  constructor(private data: ContactData) {
    this.validateEmail(data.email);
  }
  
  getEmail(): Email {
    return new Email(this.data.email);
  }
  
  private validateEmail(email: string): void {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
  }
}
// Tests still PASS, but code is cleaner
```

## 📊 Testing Strategy by Layer

### 🏛️ CRM Core Tests (90% Coverage Target)
**Focus**: Foundation stability

```typescript
// Domain Entity Tests
describe('Contact Entity', () => {
  it('should validate email format', () => {
    expect(() => new Contact({ email: 'invalid' }))
      .toThrow('Invalid email format');
  });
});

// Use Case Tests
describe('Create Contact Use Case', () => {
  it('should create and save contact', async () => {
    const useCase = new CreateContactUseCase(mockRepository);
    const result = await useCase.execute(contactData);
    expect(result.success).toBe(true);
  });
});

// Infrastructure Tests
describe('Neo4j Contact Repository', () => {
  it('should save and retrieve contact', async () => {
    const repo = new Neo4jContactRepository(mockConnection);
    await repo.save(contact);
    const retrieved = await repo.findById(contact.id);
    expect(retrieved).toEqual(contact);
  });
});
```

### 💰 Financial Extension Tests (80% Coverage Target)
**Focus**: Business logic accuracy

```typescript
// Financial Domain Tests
describe('Deal Entity', () => {
  it('should calculate deal probability', () => {
    const deal = new Deal({ stage: DealStage.LOI, engagement: 'high' });
    expect(deal.calculateProbability()).toBeGreaterThan(0.7);
  });
});

// Financial Use Cases
describe('Update Deal Stage Use Case', () => {
  it('should advance deal and publish event', async () => {
    const useCase = new UpdateDealStageUseCase(mockRepo, mockEventBus);
    await useCase.execute(dealId, DealStage.DILIGENCE);
    expect(mockEventBus.publishedEvents).toContainEqual(
      expect.objectContaining({ type: 'DealStageChanged' })
    );
  });
});
```

### 🔧 Platform Tests (95% Coverage Target)
**Focus**: Framework reliability

```typescript
// Extension Framework Tests
describe('Extension Registry', () => {
  it('should register and discover extensions', () => {
    const registry = new ExtensionRegistry();
    registry.register('financial', financialExtension);
    expect(registry.getExtension('financial')).toBe(financialExtension);
  });
});

// Cross-Extension Communication
describe('Platform Orchestrator', () => {
  it('should route requests to correct extension', async () => {
    const request = { domain: 'financial', action: 'createDeal' };
    const result = await orchestrator.route(request);
    expect(result.handledBy).toBe('financial');
  });
});
```

## 🛠️ Testing Tools & Setup

### Core Testing Stack
```json
{
  "jest": "^29.0.0",
  "@types/jest": "^29.0.0",
  "ts-jest": "^29.0.0",
  "@testing-library/react": "^13.0.0",
  "@testing-library/jest-dom": "^5.16.0",
  "supertest": "^6.2.0",
  "nock": "^13.2.0"
}
```

### Module-Specific Test Commands
```bash
# Test by module
npm run test:crm        # CRM foundation tests
npm run test:financial       # Financial extension tests  
npm run test:platform        # Platform framework tests

# Test by type
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only

# Development workflow
npm run test:watch         # Watch mode for rapid feedback
npm run test:coverage     # Coverage reports
npm run test:debug        # Debug failing tests
```

## 📈 TDD Development Workflow

### Daily Development Cycle
```bash
# Morning (1 hour): Plan & Test
1. npm run test:watch:crm    # Start watch mode
2. Write failing tests for user story
3. Verify tests fail correctly (RED)

# Afternoon (3 hours): Implement  
4. Write minimal implementation (GREEN)
5. Make all tests pass
6. Refactor code quality (REFACTOR)

# End of day (30 min): Quality
7. npm run test:coverage          # Check coverage
8. npm run lint:fix               # Clean code
9. git commit -m "feat: add feature with tests"
```

### Feature Development Pattern
```typescript
// 1. Start with Domain Entity Test
describe('Deal Entity', () => {
  it('should create deal with required fields', () => {
    // Test fails - Deal class doesn't exist
  });
});

// 2. Add Use Case Test
describe('Create Deal Use Case', () => {
  it('should create deal and publish event', () => {
    // Test fails - Use case doesn't exist
  });
});

// 3. Add Infrastructure Test
describe('Deal Repository', () => {
  it('should save deal to database', () => {
    // Test fails - Repository doesn't exist
  });
});

// 4. Add Interface Test
describe('Deal API Controller', () => {
  it('should create deal via REST endpoint', () => {
    // Test fails - Controller doesn't exist
  });
});

// 5. Implement in order: Entity → Use Case → Repository → Controller
// Each step makes some tests pass while keeping others red
```

## 🎯 Coverage Goals & Quality Gates

### Coverage Targets
- **Overall Project**: 85%+
- **CRM Core**: 90%+ (foundation stability)
- **Extensions**: 80%+ (business logic coverage)  
- **Platform**: 95%+ (framework reliability)
- **Shared**: 90%+ (utility reliability)

### Quality Gates
```bash
# Pre-commit hooks
npm run test              # All tests must pass
npm run lint              # No linting errors
npm run type-check        # No TypeScript errors
npm run test:coverage     # Meet coverage thresholds

# CI/CD Pipeline
- Unit tests: 100% pass rate
- Integration tests: 100% pass rate  
- E2E tests: 95%+ pass rate
- Security scan: No high/critical issues
```

## 🧪 Test Organization Strategy

### Test File Structure
```
test/
├── unit/                    # Fast, isolated tests
│   ├── crm/
│   ├── extensions/financial/
│   ├── platform/
│   └── shared/
├── integration/             # Cross-module tests
│   ├── crm-financial/
│   └── platform-extensions/
└── e2e/                    # Full workflow tests
    ├── deal-lifecycle/
    └── user-journeys/
```

### Test Naming Conventions
```typescript
// Entity Tests: should_[expected_behavior]_when_[condition]
it('should throw error when email is invalid', () => {});

// Use Case Tests: should_[business_outcome]_given_[input_condition]  
it('should create deal given valid input data', () => {});

// Integration Tests: should_[end_to_end_behavior]_across_[modules]
it('should create deal and notify CRM core across extensions', () => {});
```

## 🚀 Advanced TDD Patterns

### Test Doubles Strategy
```typescript
// Mocks for external dependencies
const mockGraphAPI = {
  getEmails: jest.fn().mockResolvedValue(mockEmails)
};

// Stubs for consistent test data
const stubContactData = {
  name: 'Test Contact',
  email: 'test@example.com'
};

// Spies for behavior verification
const eventBusSpy = jest.spyOn(eventBus, 'publish');
expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({
  type: 'DealCreated'
}));
```

### Property-Based Testing
```typescript
// Test with random data generation
import { property, gen } from 'testcheck';

property('deal probability is always between 0 and 1', 
  gen.object({
    stage: gen.oneOf(Object.values(DealStage)),
    engagement: gen.oneOf(['low', 'medium', 'high'])
  }),
  (dealData) => {
    const deal = new Deal(dealData);
    const probability = deal.calculateProbability();
    return probability >= 0 && probability <= 1;
  }
);
```

---

**Next**: [API Reference](api-reference.md) | [Extension Development](extension-guide.md) 