# 🏛️ Ontology-Driven Extension Architecture

This document outlines the architecture for creating and managing domain-specific extensions. These extensions encapsulate all the logic, data structures, and behaviors related to a specific business domain (e.g., CRM, Finance, Healthcare) by providing a domain-specific **ontology**.

## Guiding Principles

- **Encapsulation**: Each extension is a self-contained module. All domain-specific logic resides within its directory.
- **Explicit Dependencies**: Extensions should not directly depend on each other. Any cross-domain interaction must be handled by dedicated "Ontology Bridges".
- **Standardized Structure**: All extensions follow a consistent directory structure to ensure predictability and ease of maintenance.
- **Ontology as the Core**: The heart of each extension is its `ontology.json` file, which defines the entities, relationships, and rules for its domain.

## Extension Structure

Each extension, located under `src/ontologies/`, must follow this structure:

```
src/ontologies/
└── my-domain/
    ├── application/
    │   ├── dto/                # Data Transfer Objects
    │   ├── services/           # Application services (business logic)
    │   └── use-cases/          # High-level use cases
    ├── domain/
    │   ├── entities/           # Core domain entities
    │   ├── repositories/       # Interfaces for data persistence
    │   └── value-objects/      # Domain value objects
    ├── infrastructure/
    │   ├── database/           # Neo4j queries, repository implementations
    │   └── external-apis/      # Clients for external services
    ├── interface/
    │   ├── api/                # REST/GraphQL controllers
    │   └── ui/                 # UI components (if any)
    ├── ontology.json           # Core ontology definition for the extension
    └── register.ts             # Entry point for service container registration
```

### Key Components

- **`ontology.json`**: Defines the entities and relationships for this specific domain. It's the source of truth for the extension's knowledge model.
- **`register.ts`**: Handles the registration of the extension's services into the dependency injection container (`tsyringe`). This is crucial for making the services available to the rest of the application.
- **Application Services**: Contain the core business logic. They orchestrate domain entities and repositories to fulfill specific tasks.
- **Domain Entities**: Represent the core concepts of the domain, rich with business rules and logic.

## Creating a New Extension

To create a new extension (e.g., for "Real Estate"):

1.  Create a new directory: `src/ontologies/real-estate`.
2.  Follow the standardized structure outlined above.
3.  Define your entities in `ontology.json`.
4.  Implement the necessary services, entities, and repositories.
5.  Register your services in `register.ts`.
6.  Ensure the platform's main entry point calls your new `register.ts` function.

## Cross-Extension Communication: Ontology Bridges

Direct communication between extensions is discouraged. To handle cases where domains need to interact (e.g., linking a `Financial::Deal` to a `CRM::Contact`), we use **Ontology Bridges**.

An Ontology Bridge is a dedicated service that explicitly defines and manages the mapping and interaction between two domains.

**Example**: `FinancialToCrmBridge`

- **Responsibility**: Translates financial concepts into CRM-compatible entities or relationships.
- **Location**: Typically located in the more specific domain (e.g., `financial` would define how it bridges to the more generic `crm`).

By using bridges, we keep the core domains decoupled and make cross-domain logic explicit and manageable.

## Core Extension Contract

The platform interacts with extensions through a standardized interface.

```typescript
interface Extension {
  // Extension metadata
  readonly name: string;
  readonly version: string;
  
  // Lifecycle methods
  initialize(context: PlatformContext): Promise<void>;
  shutdown(): Promise<void>;
  
  // Extension capabilities
  getOntology(): object;
  getRoutes(): Route[];
  getComponents(): Component[];
}
```
This contract ensures that the platform can reliably load, initialize, and integrate any extension that adheres to the defined structure and interface.

## Extension Loading Process

The platform's `ExtensionRegistry` is responsible for the lifecycle of all extensions.

### 1. **Discovery**
The registry scans the `src/ontologies/` directory to find all available extensions.

### 2. **Registration & Validation**
Each extension's `register.ts` is executed, adding its services to the dependency injection container. The platform can validate the extension against the required contract.

### 3. **Initialization**
The platform iterates through the loaded extensions and calls their `initialize` method, passing in a `PlatformContext` object that may contain shared services like an event bus or logger. This allows each extension to perform its setup logic, such as subscribing to events.

## 🔌 Extension System Architecture

## 🎯 Overview

The Extensible CRM Platform is built around a **plugin architecture** that allows domain-specific business logic to be added as independent extensions without modifying the core CRM system.

## 🏗️ Extension Architecture Principles

### 1. **Core Independence**
- **CRM Core**: Remains domain-agnostic and stable
- **Extensions**: Add domain-specific functionality
- **Clean Boundaries**: Well-defined interfaces between layers

### 2. **Plugin Pattern**
- **Dynamic Discovery**: Extensions found at runtime
- **Interface Contracts**: Standardized extension API
- **Lifecycle Management**: Initialize, run, shutdown phases

### 3. **Event-Driven Communication**
- **Loose Coupling**: Extensions communicate via events
- **Async Processing**: Non-blocking inter-extension calls
- **Data Consistency**: Eventually consistent across extensions

## 🔧 Extension Interface

### Core Extension Contract
```typescript
interface Extension {
  // Extension metadata
  readonly name: string;
  readonly version: string;
  readonly dependencies: string[];
  readonly description: string;
  
  // Lifecycle methods
  initialize(crmCore: CRMCore): Promise<void>;
  shutdown(): Promise<void>;
  
  // Extension capabilities
  getRoutes(): Route[];
  getComponents(): Component[];
  getUseCases(): UseCase[];
  getEventHandlers(): EventHandler[];
  
  // Health and status
  getHealthStatus(): HealthStatus;
  getMetrics(): ExtensionMetrics;
}
```

### Extension Registration
```typescript
// extensions/financial/financial.extension.ts
export class FinancialExtension implements Extension {
  readonly name = 'financial';
  readonly version = '1.0.0';
  readonly dependencies = ['crm'];
  readonly description = 'Deal tracking and investment management';
  
  async initialize(crmCore: CRMCore): Promise<void> {
    // Register financial entities with CRM core
    crmCore.registerEntityType('Deal', DealEntity);
    crmCore.registerValueObject('Money', MoneyValueObject);
    
    // Set up event subscriptions
    crmCore.eventBus.subscribe('ContactCreated', this.handleContactCreated);
    
    // Initialize financial services
    await this.initializeServices();
  }
  
  getRoutes(): Route[] {
    return [
      { path: '/api/deals', method: 'GET', handler: this.listDeals },
      { path: '/api/deals', method: 'POST', handler: this.createDeal },
      { path: '/api/deals/:id', method: 'PUT', handler: this.updateDeal }
    ];
  }
  
  getComponents(): Component[] {
    return [
      { name: 'DealCard', component: DealCard },
      { name: 'DealDashboard', component: DealDashboard },
      { name: 'ProbabilityChart', component: ProbabilityChart }
    ];
  }
}
```

## 📊 Extension Directory Structure

### Standard Extension Layout
```
src/ontologies/my-domain/
├── 📄 my-domain.extension.ts    # Extension definition
├── 📄 index.ts                  # Extension exports
├── 📁 domain/                   # Domain layer
│   ├── entities/               # Domain entities
│   ├── value-objects/          # Value objects
│   ├── repositories/           # Repository interfaces
│   ├── services/               # Domain services
│   └── events/                 # Domain events
├── 📁 application/              # Application layer
│   ├── use-cases/              # Use case implementations
│   ├── dto/                    # Data transfer objects
│   ├── ports/                  # External service interfaces
│   └── agents/                 # AI agents (optional)
├── 📁 infrastructure/           # Infrastructure layer
│   ├── database/               # Data persistence
│   ├── external-apis/          # Third-party integrations
│   └── nlp/                    # NLP processing (optional)
└── 📁 interface/                # Interface layer
    ├── api/                    # REST API controllers
    ├── ui/                     # UI components
    └── events/                 # Event handlers
```

## 🔄 Extension Loading Process

### 1. **Discovery Phase**
```typescript
class ExtensionRegistry {
  async discoverExtensions(extensionsPath: string): Promise<string[]> {
    const directories = await fs.readdir(extensionsPath);
    const extensions: string[] = [];
    
    for (const dir of directories) {
      const extensionFile = path.join(extensionsPath, dir, `${dir}.extension.ts`);
      if (await fs.pathExists(extensionFile)) {
        extensions.push(dir);
      }
    }
    
    return extensions;
  }
}
```

### 2. **Validation Phase**
```typescript
class ExtensionValidator {
  validate(extension: Extension): ValidationResult {
    const errors: string[] = [];
    
    // Check required properties
    if (!extension.name) errors.push('Extension name is required');
    if (!extension.version) errors.push('Extension version is required');
    
    // Check required methods
    if (typeof extension.initialize !== 'function') {
      errors.push('Extension must implement initialize method');
    }
    
    // Check directory structure
    const requiredDirectories = ['domain', 'application', 'infrastructure', 'interface'];
    for (const dir of requiredDirectories) {
      if (!this.directoryExists(`src/ontologies/${extension.name}/${dir}`)) {
        errors.push(`Missing required directory: ${dir}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### 3. **Loading Phase**
```typescript
class ExtensionLoader {
  async loadExtension(extensionName: string): Promise<Extension> {
    const extensionModule = await import(`../extensions/${extensionName}/${extensionName}.extension.ts`);
    const ExtensionClass = extensionModule[`${capitalize(extensionName)}Extension`];
    
    if (!ExtensionClass) {
      throw new Error(`Extension class not found for ${extensionName}`);
    }
    
    return new ExtensionClass();
  }
}
```

### 4. **Initialization Phase**
```typescript
class PlatformOrchestrator {
  async initializeExtensions(crmCore: CRMCore): Promise<void> {
    const extensions = await this.registry.getAllExtensions();
    
    // Sort by dependencies (topological sort)
    const sortedExtensions = this.sortByDependencies(extensions);
    
    // Initialize in dependency order
    for (const extension of sortedExtensions) {
      try {
        await extension.initialize(crmCore);
        this.logger.info(`Extension ${extension.name} initialized successfully`);
      } catch (error) {
        this.logger.error(`Failed to initialize extension ${extension.name}:`, error);
        throw error;
      }
    }
  }
}
```

## 🔗 Cross-Extension Communication

### Event-Based Communication
```typescript
// Extension A publishes an event
class FinancialExtension {
  async createDeal(dealData: CreateDealDto): Promise<void> {
    const deal = new Deal(dealData);
    await this.dealRepository.save(deal);
    
    // Publish event for other extensions
    await this.eventBus.publish('DealCreated', {
      dealId: deal.id,
      contactId: deal.contactId,
      value: deal.value.amount,
      timestamp: new Date()
    });
  }
}

// Extension B handles the event
class MarketingExtension {
  @EventHandler('DealCreated')
  async handleDealCreated(event: DealCreatedEvent): Promise<void> {
    // Create marketing campaign for high-value deals
    if (event.value > 1_000_000) {
      await this.createVIPCampaign(event.contactId);
    }
  }
}
```

### Service-Based Communication
```typescript
// CRM Core provides shared services
class CRMCore {
  getContactService(): ContactService {
    return this.contactService;
  }
  
  getCommunicationService(): CommunicationService {
    return this.communicationService;
  }
}

// Extensions use CRM services
class FinancialExtension {
  async enrichDealWithContact(deal: Deal): Promise<EnrichedDeal> {
    const contact = await this.crmCore.getContactService().findById(deal.contactId);
    return new EnrichedDeal(deal, contact);
  }
}
```

## 🎯 Extension Development Template

### Creating a New Extension
```bash
# 1. Create extension structure
npm run extension:create my-domain

# 2. Generated structure:
src/ontologies/my-domain/
├── my-domain.extension.ts      # ✅ Extension definition
├── index.ts                    # ✅ Exports
├── domain/                     # ✅ Domain layer
├── application/                # ✅ Application layer  
├── infrastructure/             # ✅ Infrastructure layer
└── interface/                  # ✅ Interface layer

# 3. Implement extension interface
export class MyDomainExtension implements Extension {
  readonly name = 'my-domain';
  readonly version = '1.0.0';
  readonly dependencies = ['crm'];
  
  async initialize(crmCore: CRMCore): Promise<void> {
    // Implementation
  }
}

# 4. Register extension
// platform/registry/extension-registry.ts
registry.register(new MyDomainExtension());
```

### Extension Testing Strategy
```typescript
describe('MyDomain Extension', () => {
  let extension: MyDomainExtension;
  let mockCrmCore: jest.Mocked<CRMCore>;
  
  beforeEach(() => {
    mockCrmCore = createMockCrmCore();
    extension = new MyDomainExtension();
  });
  
  it('should initialize successfully', async () => {
    await extension.initialize(mockCrmCore);
    
    expect(mockCrmCore.registerEntityType).toHaveBeenCalled();
    expect(extension.getHealthStatus().status).toBe('healthy');
  });
  
  it('should provide required routes', () => {
    const routes = extension.getRoutes();
    
    expect(routes).toContainEqual(
      expect.objectContaining({ path: '/api/my-domain' })
    );
  });
});
```

## 🚀 Extension Development Best Practices

### 1. **Domain-Driven Design**
- **Entities**: Core business objects with identity
- **Value Objects**: Immutable objects without identity
- **Aggregates**: Consistency boundaries
- **Domain Services**: Domain logic that doesn't belong to entities

### 2. **Clean Architecture**
- **Domain Layer**: Pure business logic, no external dependencies
- **Application Layer**: Use cases and application services
- **Infrastructure Layer**: External systems and persistence
- **Interface Layer**: APIs, UIs, and event handlers

### 3. **Testing Strategy**
- **Unit Tests**: Domain logic in isolation
- **Integration Tests**: Extension integration with CRM core
- **End-to-End Tests**: Complete extension workflows

### 4. **Performance Considerations**
- **Lazy Loading**: Load extension resources on demand
- **Caching**: Cache frequently accessed data
- **Async Processing**: Use async operations for I/O
- **Resource Management**: Clean up resources on shutdown

## 📊 Extension Metrics & Monitoring

### Health Checks
```typescript
class FinancialExtension {
  getHealthStatus(): HealthStatus {
    return {
      status: 'healthy',
      checks: {
        database: this.checkDatabaseConnection(),
        externalApis: this.checkExternalAPIs(),
        memoryUsage: this.checkMemoryUsage()
      },
      timestamp: new Date()
    };
  }
}
```

### Performance Metrics
```typescript
class ExtensionMetrics {
  getMetrics(): ExtensionMetrics {
    return {
      requestCount: this.requestCounter.count(),
      averageResponseTime: this.responseTimer.average(),
      errorRate: this.errorCounter.rate(),
      memoryUsage: process.memoryUsage(),
      customMetrics: this.getCustomMetrics()
    };
  }
}
```

## 🔮 Future Extension Ideas

### Real Estate Extension
- **Entities**: Property, Listing, Client, Transaction
- **Features**: Property valuation, market analysis, showing scheduling
- **Integrations**: MLS systems, property databases

### Healthcare Extension
- **Entities**: Patient, Appointment, Treatment, Provider
- **Features**: Patient management, appointment scheduling, treatment tracking
- **Integrations**: EHR systems, insurance providers

### Legal Extension
- **Entities**: Case, Client, Document, Billing
- **Features**: Case management, document tracking, time billing
- **Integrations**: Court systems, legal databases

---

**Next**: [Data Flow Architecture](data-flow.md) | [Security Architecture](security.md) 