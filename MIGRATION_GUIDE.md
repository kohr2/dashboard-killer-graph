# 📦 Migration Guide: Current → Improved Architecture

## 🎯 Migration Overview

This guide walks you through migrating from the current basic structure to the improved Clean Architecture + DDD approach.

## 📋 Migration Steps

### Step 1: Backup Current Work (5 minutes)
```bash
# Create a backup branch
git checkout -b backup-original-structure
git add .
git commit -m "Backup original structure before migration"

# Return to main branch
git checkout main
```

### Step 2: Create New Folder Structure (15 minutes)

```bash
# Create the new directory structure
mkdir -p src/{domain,application,infrastructure,interface,shared}
mkdir -p src/domain/{entities,value-objects,repositories,services,events}
mkdir -p src/application/{use-cases,agents,dto,ports}
mkdir -p src/application/use-cases/{deal,communication,insights}
mkdir -p src/infrastructure/{database,external-apis,ontology,nlp,messaging,caching}
mkdir -p src/infrastructure/database/{neo4j,migrations}
mkdir -p src/infrastructure/external-apis/{microsoft-graph,salesforce,openai}
mkdir -p src/interface/{web,ui,cli}
mkdir -p src/interface/web/{controllers,middleware,routes}
mkdir -p src/interface/ui/{components,hooks,store,pages}
mkdir -p src/shared/{utils,constants,types,config}

# Move test structure to match
mkdir -p test/{unit,integration,e2e,fixtures,mocks,utils}
mkdir -p test/unit/{domain,application,infrastructure}
```

### Step 3: Move Existing Files (30 minutes)

**Current → New Structure Mapping:**

| Current File | New Location | Action |
|------------|-------------|---------|
| `test/ontology/crm-ontology.test.ts` | `test/unit/domain/entities/` | Move & refactor |
| `test/graph/neo4j-connection.test.ts` | `test/unit/infrastructure/database/` | Move |
| `package.json` | `package.json` | Keep (no change) |
| `docker-compose.yml` | `docker-compose.yml` | Keep (no change) |

```bash
# Move test files
mv test/ontology/crm-ontology.test.ts test/unit/domain/
mv test/graph/neo4j-connection.test.ts test/unit/infrastructure/database/

# Update imports in moved test files (we'll do this in next step)
```

### Step 4: Create Core Domain Layer (60 minutes)

#### 4.1 Create Value Objects
```bash
# Create value objects with proper validation
touch src/domain/value-objects/{deal-stage.ts,money.ts,probability.ts,contact-info.ts}
```

**Example: `src/domain/value-objects/deal-stage.ts`**
```typescript
export class DealStage {
  private static readonly VALID_STAGES = [
    'SOURCING', 'LOI', 'DILIGENCE', 'CLOSING', 'COMPLETED', 'LOST'
  ] as const;

  private static readonly VALID_TRANSITIONS = {
    SOURCING: ['LOI', 'LOST'],
    LOI: ['DILIGENCE', 'LOST'],
    DILIGENCE: ['CLOSING', 'LOST'],
    CLOSING: ['COMPLETED', 'LOST'],
    COMPLETED: [],
    LOST: []
  };

  private constructor(private readonly _value: string) {}

  static from(value: string): DealStage {
    if (!this.VALID_STAGES.includes(value as any)) {
      throw new Error(`Invalid deal stage: ${value}`);
    }
    return new DealStage(value);
  }

  static get SOURCING() { return new DealStage('SOURCING'); }
  static get LOI() { return new DealStage('LOI'); }
  static get DILIGENCE() { return new DealStage('DILIGENCE'); }
  static get CLOSING() { return new DealStage('CLOSING'); }
  static get COMPLETED() { return new DealStage('COMPLETED'); }
  static get LOST() { return new DealStage('LOST'); }

  get value(): string { return this._value; }

  equals(other: DealStage): boolean {
    return this._value === other._value;
  }

  canTransitionTo(target: DealStage): boolean {
    const validTargets = DealStage.VALID_TRANSITIONS[this._value as keyof typeof DealStage.VALID_TRANSITIONS];
    return validTargets.includes(target._value as any);
  }
}
```

#### 4.2 Create Repository Interfaces
```bash
touch src/domain/repositories/{deal-repository.ts,contact-repository.ts,email-repository.ts}
```

**Example: `src/domain/repositories/deal-repository.ts`**
```typescript
import { Deal } from '../entities/deal';
import { DealStage } from '../value-objects/deal-stage';

export interface DealRepository {
  findById(id: string): Promise<Deal | null>;
  findByName(name: string): Promise<Deal | null>;
  findByStage(stage: DealStage): Promise<Deal[]>;
  findActiveDeals(): Promise<Deal[]>;
  save(deal: Deal): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### Step 5: Update Test Files (45 minutes)

**Update test imports and structure:**

```typescript
// test/unit/domain/deal.test.ts
import { Deal } from '../../../src/domain/entities/deal';
import { DealStage } from '../../../src/domain/value-objects/deal-stage';
import { Money } from '../../../src/domain/value-objects/money';

describe('Deal Entity', () => {
  describe('Creation', () => {
    it('should create a new deal with valid parameters', () => {
      const deal = Deal.create({
        id: 'deal-123',
        name: 'Project Gotham',
        value: Money.usd(50_000_000)
      });

      expect(deal.id).toBe('deal-123');
      expect(deal.name).toBe('Project Gotham');
      expect(deal.stage).toEqual(DealStage.SOURCING);
    });
  });

  describe('Stage Transitions', () => {
    it('should allow valid stage transitions', () => {
      const deal = Deal.create({
        id: 'deal-123',
        name: 'Project Gotham',
        value: Money.usd(50_000_000)
      });

      expect(() => deal.updateStage(DealStage.LOI)).not.toThrow();
      expect(deal.stage).toEqual(DealStage.LOI);
    });

    it('should reject invalid stage transitions', () => {
      const deal = Deal.create({
        id: 'deal-123',
        name: 'Project Gotham',
        value: Money.usd(50_000_000)
      });

      expect(() => deal.updateStage(DealStage.CLOSING)).toThrow();
    });
  });
});
```

### Step 6: Create Infrastructure Layer (90 minutes)

#### 6.1 Neo4j Repository Implementation
```bash
touch src/infrastructure/database/neo4j/neo4j-deal-repository.ts
```

**Example implementation:**
```typescript
import { DealRepository } from '../../../domain/repositories/deal-repository';
import { Deal } from '../../../domain/entities/deal';
import { Neo4jConnection } from './neo4j-connection';

export class Neo4jDealRepository implements DealRepository {
  constructor(private readonly connection: Neo4jConnection) {}

  async findById(id: string): Promise<Deal | null> {
    const result = await this.connection.query(
      'MATCH (d:Deal {id: $id}) RETURN d',
      { id }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    return this.mapToDomain(record.get('d'));
  }

  async save(deal: Deal): Promise<void> {
    const query = `
      MERGE (d:Deal {id: $id})
      SET d.name = $name,
          d.stage = $stage,
          d.value = $value,
          d.probability = $probability,
          d.updatedAt = $updatedAt
    `;

    await this.connection.query(query, {
      id: deal.id,
      name: deal.name,
      stage: deal.stage.value,
      value: deal.value.amount,
      probability: deal.probability.value,
      updatedAt: deal.updatedAt.toISOString()
    });
  }

  private mapToDomain(node: any): Deal {
    // Map Neo4j node to domain entity
    // Implementation details...
  }
}
```

### Step 7: Create Application Layer (60 minutes)

#### 7.1 Dependency Injection Container
```bash
touch src/shared/container/container.ts
```

```typescript
// Simple DI container
export class Container {
  private dependencies = new Map<string, any>();

  register<T>(token: string, implementation: T): void {
    this.dependencies.set(token, implementation);
  }

  resolve<T>(token: string): T {
    const dependency = this.dependencies.get(token);
    if (!dependency) {
      throw new Error(`Dependency ${token} not found`);
    }
    return dependency;
  }
}

// Container setup
export const container = new Container();

// Register dependencies
container.register('DealRepository', new Neo4jDealRepository(neo4jConnection));
container.register('UpdateDealStageUseCase', new UpdateDealStageUseCase(
  container.resolve('DealRepository'),
  container.resolve('EventBus'),
  container.resolve('Logger')
));
```

### Step 8: Update Package.json Scripts (10 minutes)

Add new scripts for the improved structure:

```json
{
  "scripts": {
    "test:unit": "jest test/unit",
    "test:integration": "jest test/integration",
    "test:e2e": "jest test/e2e",
    "test:domain": "jest test/unit/domain",
    "test:application": "jest test/unit/application",
    "test:infrastructure": "jest test/unit/infrastructure",
    "build:domain": "tsc --build src/domain",
    "lint:domain": "eslint src/domain --ext .ts",
    "clean": "rm -rf dist && rm -rf src/**/*.js"
  }
}
```

### Step 9: Update Jest Configuration (15 minutes)

**Create separate Jest configs for different test types:**

```javascript
// jest.unit.config.js
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/test/unit/**/*.test.ts'],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/application/**/*.ts'
  ]
};

// jest.integration.config.js
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/test/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration.ts']
};
```

### Step 10: Validation & Testing (30 minutes)

```bash
# Install dependencies
npm install

# Run tests to verify migration
npm run test:unit
npm run test:integration

# Check TypeScript compilation
npm run type-check

# Run linting
npm run lint

# Build project
npm run build
```

## 🎯 Migration Checklist

### Phase 1: Structure (Day 1)
- [ ] ✅ Create new folder structure
- [ ] ✅ Move existing files
- [ ] ✅ Update imports in moved files
- [ ] ✅ Create basic value objects
- [ ] ✅ Create repository interfaces

### Phase 2: Domain Layer (Day 2)
- [ ] ✅ Implement core entities (Deal, Contact, Task)
- [ ] ✅ Add domain events
- [ ] ✅ Create domain services
- [ ] ✅ Write comprehensive unit tests

### Phase 3: Application Layer (Day 3)
- [ ] ✅ Implement use cases
- [ ] ✅ Create DTOs
- [ ] ✅ Set up dependency injection
- [ ] ✅ Add application service tests

### Phase 4: Infrastructure Layer (Day 4)
- [ ] ✅ Implement Neo4j repositories
- [ ] ✅ Create external API clients
- [ ] ✅ Add ontology management
- [ ] ✅ Write integration tests

### Phase 5: Interface Layer (Day 5)
- [ ] ✅ Create API controllers
- [ ] ✅ Update React components
- [ ] ✅ Add CLI commands
- [ ] ✅ Write E2E tests

## 🚨 Common Migration Issues

### 1. **Circular Dependencies**
- **Problem**: Domain imports infrastructure
- **Solution**: Use dependency inversion (interfaces)

### 2. **Test Setup Complexity**
- **Problem**: Too many mocks needed
- **Solution**: Use test builders and factories

### 3. **Path Import Issues**
- **Problem**: Complex relative imports
- **Solution**: Configure path mapping in tsconfig.json

### 4. **Performance Impact**
- **Problem**: More layers = slower?
- **Solution**: Measure and optimize hot paths

## 📚 Benefits After Migration

1. **Testability**: 95%+ code coverage achievable
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Easy to add new features
4. **Team Collaboration**: Clear code ownership
5. **Future-Proofing**: Easy to extract microservices

## 🎉 Success Metrics

- [ ] All existing tests still pass
- [ ] No circular dependencies
- [ ] Build time < 30 seconds
- [ ] Test suite runs in < 2 minutes
- [ ] TypeScript strict mode enabled
- [ ] ESLint with no warnings

---

**Estimated Total Migration Time: 2-3 days for experienced developer, 4-5 days for team** 