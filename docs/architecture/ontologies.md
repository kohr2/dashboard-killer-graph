# 🏛️ Architecture des Extensions et Ontologies

Ce document décrit l'architecture de la plateforme, conçue autour d'extensions modulaires et pilotées par des ontologies. Chaque extension encapsule la logique, les structures de données et les comportements d'un domaine métier spécifique (ex: CRM, Finance, Santé).

## Principes Directeurs

- **Encapsulation & Modularité**: Chaque extension est un module autonome. Toute la logique spécifique à un domaine réside dans son répertoire, la rendant indépendante et facile à maintenir.
- **Ontologie au Centre**: Le cœur de chaque extension est son fichier `ontology.json`. Il définit les entités, les relations et les règles du domaine, servant de source de vérité pour le modèle de connaissances.
- **Dépendances Explicites**: Les extensions ne doivent pas dépendre directement les unes des autres. Toute interaction inter-domaines est gérée par des "Ponts Ontologiques" (`Ontology Bridges`).
- **Structure Standardisée**: Toutes les extensions suivent une structure de répertoires cohérente pour assurer la prévisibilité et la facilité de développement.

## Structure d'une Extension

Chaque extension, située sous `src/ontologies/`, doit respecter la structure suivante :

```
src/ontologies/
└── mon-domaine/
    ├── application/
    │   ├── dto/                # Data Transfer Objects pour les API
    │   ├── services/           # Services applicatifs (logique métier)
    │   └── use-cases/          # Cas d'utilisation de haut niveau
    ├── domain/
    │   ├── entities/           # Entités du domaine (logique et règles métier)
    │   ├── repositories/       # Interfaces pour la persistance des données
    │   └── value-objects/      # Objets de valeur du domaine
    ├── infrastructure/
    │   ├── database/           # Implémentations des repositories (ex: requêtes Neo4j)
    │   └── external-apis/      # Clients pour les services externes
    ├── interface/
    │   ├── api/                # Contrôleurs REST/GraphQL (si nécessaire)
    │   └── ui/                 # Composants d'interface (si nécessaire)
    ├── ontology.json           # Définition de l'ontologie du domaine
    └── index.ts                # Point d'entrée pour l'enregistrement des services
```

## Le Fichier `ontology.json`

Ce fichier est la clé de voûte de l'extension. Il définit le schéma du graphe de connaissances pour le domaine concerné. Le `OntologyService` de la plateforme utilise ce fichier pour configurer la base de données et valider les données.

**Exemple simplifié d' `ontology.json`** :
```json
{
  "name": "crm",
  "entities": [
    { "name": "Contact", "properties": { "email": "string", "name": "string" } },
    { "name": "Organization", "properties": { "name": "string" } }
  ],
  "relationships": [
    { "name": "WORKS_AT", "source": "Contact", "target": "Organization" }
  ]
}
```

## Comment Créer une Nouvelle Extension ?

Voici les étapes pour créer une extension "Immobilier" (`real-estate`):

1.  **Créer le Répertoire**:
    Créez `src/ontologies/real-estate` avec la structure de répertoires décrite ci-dessus.

2.  **Définir l'Ontologie**:
    Créez `src/ontologies/real-estate/ontology.json`. Définissez les entités (`Property`, `Agent`) et leurs relations.

3.  **Implémenter le Domaine**:
    - Créez les entités dans `domain/entities/`.
    - Définissez les interfaces des repositories dans `domain/repositories/` (ex: `i-property-repository.ts`).

4.  **Implémenter l'Application et l'Infrastructure**:
    - Créez les services dans `application/services/`.
    - Implémentez les repositories dans `infrastructure/database/` pour interagir avec Neo4j.

5.  **Enregistrer les Services**:
    Dans `src/ontologies/real-estate/index.ts`, enregistrez vos services dans le conteneur d'injection de dépendances (`tsyringe`).

    ```typescript
    // src/ontologies/real-estate/index.ts
    import { container } from "tsyringe";
    import { RealEstateService } from "./application/services/real-estate.service";
    import { Neo4jPropertyRepository } from "./infrastructure/database/neo4j-property.repository";

    export function registerRealEstate() {
      container.register("IPropertyRepository", {
        useClass: Neo4jPropertyRepository,
      });
      container.register("RealEstateService", {
        useClass: RealEstateService,
      });
    }
    ```

6.  **Intégrer à la Plateforme**:
    Assurez-vous que la fonction `registerRealEstate()` est appelée au démarrage de l'application, généralement dans un fichier central comme `src/register-ontologies.ts`.

    ```typescript
    // src/register-ontologies.ts
    import { registerCrm } from "./ontologies/crm";
    import { registerFinancial } from "./ontologies/financial";
    import { registerRealEstate } from "./ontologies/real-estate"; // <-- AJOUTER ICI

    export function registerAllOntologies() {
      registerCrm();
      registerFinancial();
      registerRealEstate(); // <-- AJOUTER ICI
    }
    ```

    > **Note sur les Singletons**: Pour certains services fondamentaux et transverses, comme un service d'ontologie qui maintient un état en mémoire, un modèle Singleton (ex: `MyOntologyService.getInstance()`) peut être utilisé à la place de l'injection de dépendances pour garantir une instance unique à travers toute l'application. C'est une approche pragmatique utilisée par certains services existants.

## Communication Inter-Extensions : Les Ponts Ontologiques

Pour éviter un couplage fort, les extensions communiquent via des **Ponts Ontologiques**. Un pont est un service dédié qui gère la traduction et l'interaction entre deux domaines.

**Exemple**: Lier un `Deal` (domaine `Financial`) à un `Contact` (domaine `CRM`).

Le pont `FinancialToCrmBridge` serait responsable de créer les liens appropriés dans le graphe. Il serait situé dans le domaine qui initie la communication (ici, `financial`).

En utilisant ce modèle, les domaines restent découplés, et la logique inter-domaines est explicite et centralisée dans les ponts.

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