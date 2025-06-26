# 🏗️ Architecture Overview

## 🎯 System Architecture

The Extensible CRM Platform implements a **modular, domain-driven architecture** where all business logic, including foundational CRM features, is implemented through pluggable extensions. This ensures the core platform remains lean and domain-agnostic.

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 Interface Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   CRM UI    │  │ Financial   │  │  Agent APIs │         │
│  │ Components  │  │ Extension   │  │   Gateway   │         │
│  │  (from Ext) │  │     UI      │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                 🎯 Extension Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  🧩 CRM      │  │  💰 Financial│  │ 🏠 Real Est │         │
│  │  Extension   │  │  Extension   │  │ Extension   │         │
│  │ (Active)     │  │ (Active)     │  │  (Future)   │         │
│  │              │  │              │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                🔧 Platform Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Extension   │  │    Event    │  │  Extension  │         │
│  │ Framework   │  │     Bus     │  │  Registry   │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│              🤝 Shared Infrastructure                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Database   │  │   External  │  │   Config    │         │
│  │  (Neo4j)    │  │   APIs      │  │ Management  │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Core Architectural Principles

### 1. **Separation of Concerns**
- **Extensions**: All domain-specific business logic (CRM, financial, real estate) resides here.
- **Platform**: Extension orchestration and framework services.
- **Shared**: Cross-cutting infrastructure concerns like database connections and configuration.

### 2. **Dependency Inversion**
```typescript
// Extensions depend on the Platform, not on each other.
Extensions → Platform → Shared Infrastructure

// Clean dependency flow ensures:
// - The Platform remains domain-agnostic.
// - Extensions can be developed and deployed independently.
// - The Platform provides stable orchestration services and contracts.
```

### 3. **Plugin Architecture**
- **Dynamic Loading**: Extensions discovered and loaded at runtime
- **Event-Driven**: Loose coupling through a platform event bus.
- **Modular Deployment**: Independent extension deployment.

## 📊 Module Structure

### 🏛️ CRM Core (`src/crm/`)
**Purpose**: Generic CRM foundation that works for any business domain

```
crm/
├── domain/           # Core business entities
│   ├── entities/     # Contact, Communication, Task, Organization
│   ├── value-objects/# Email, Phone, Address, DateTime
│   ├── repositories/ # Core data access interfaces
│   └── services/     # Core business services
├── application/      # Core use cases
│   ├── use-cases/    # CreateContact, RecordCommunication
│   ├── services/     # Application orchestration
│   └── ports/        # External service interfaces
├── infrastructure/   # Core infrastructure
│   ├── database/     # Core data persistence
│   ├── external-apis/# Email providers, calendar systems
│   └── messaging/    # Core event bus
└── interface/        # Core APIs and UI
    ├── api/          # REST endpoints
    └── ui/           # CRM UI components
```

### 💰 Financial Extension (`src/ontologies/financial/`)
**Purpose**: Deal tracking and investment management domain logic

```
financial/
├── domain/           # Financial business entities
│   ├── entities/     # Deal, Investment, Investor, Portfolio
│   ├── value-objects/# Money, DealStage, Probability, ROI
│   ├── repositories/ # Financial data access interfaces
│   └── services/     # Deal probability, market analysis
├── application/      # Financial use cases
│   ├── use-cases/    # CreateDeal, CalculateProbability
│   ├── agents/       # AI agents for deal insights
│   └── dto/          # Financial data transfer objects
├── infrastructure/   # Financial infrastructure
│   ├── ontology/     # Financial domain ontologies
│   ├── nlp/          # Financial NLP processing
│   └── external-apis/# Market data, financial services
└── interface/        # Financial UI and API
    ├── api/          # Deal management endpoints
    └── ui/           # Deal dashboard, deal cards
```

### 🔧 Platform Layer (`src/platform/`)
**Purpose**: Extension framework and cross-cutting orchestration

```
platform/
├── extension-framework/  # Extension loading and management
│   ├── registry.ts      # Extension discovery and registration
│   ├── loader.ts        # Dynamic extension loading
│   └── validator.ts     # Extension structure validation
├── orchestration/       # Cross-extension coordination
│   ├── router.ts        # Route requests to extensions
│   ├── event-bus.ts     # Inter-extension messaging
│   └── context.ts       # Shared execution context
└── registry/           # Extension metadata management
    ├── metadata.ts     # Extension configuration
    └── lifecycle.ts    # Extension lifecycle management
```

## 🔄 Data Flow Architecture

### Request Processing Flow
```
1. API Request → Interface Layer (e.g., API Gateway)
2. Route to Extension → Platform Router
3. Execute Use Case → Extension's Application Layer
4. Access Data via Repositories → Extension's Infrastructure Layer
5. Persist Changes → Shared Infrastructure (e.g., Neo4j)
6. Publish Events → Platform Event Bus
7. Return Response → Interface Layer
```

### Cross-Extension Communication
```
Extension A → Platform Event Bus → Extension B
```

## 🛡️ Security Architecture

### Authentication & Authorization
- **API Gateway**: Centralized authentication
- **Extension Boundaries**: Role-based access control
- **Data Isolation**: Extension data segregation
- **Audit Trail**: Comprehensive logging

### Data Protection
- **Encryption**: At rest and in transit
- **Privacy**: GDPR compliance by design
- **Access Control**: Fine-grained permissions
- **Data Retention**: Configurable retention policies

## 🚀 Scalability Design

### Horizontal Scaling
- **Stateless Design**: No server-side sessions
- **Database Sharding**: Extension-specific data partitioning
- **Event Sourcing**: Scalable event processing
- **Microservice Ready**: Extension-level service deployment

### Vertical Scaling
- **Lazy Loading**: Extensions loaded on demand
- **Caching Strategy**: Multi-level caching
- **Resource Optimization**: Memory and CPU efficiency
- **Performance Monitoring**: Real-time metrics

## 📈 Extension Development Model

### Extension Lifecycle
1. **Development**: Use extension template and patterns
2. **Registration**: Register with platform registry
3. **Validation**: Platform validates extension structure
4. **Loading**: Dynamic loading at runtime
5. **Integration**: Event bus and API integration
6. **Monitoring**: Health checks and metrics

### Extension Interface Contract
```typescript
interface Extension {
  readonly name: string;
  readonly version: string;
  
  initialize(platform: PlatformContext): Promise<void>;
  getRoutes(): Route[];
  getComponents(): Component[];
  getUseCases(): UseCase[];
  getOntology(): object;
  shutdown(): Promise<void>;
}
```

## 🧠 Ontology-Driven Data Unification

To create a cohesive and queryable knowledge graph, the platform employs an ontology-driven approach to unify data from different domains. This ensures that even though extensions define their own specific entities, they can be understood and linked through a shared, core vocabulary.

### Key Components

1.  **Ontology-Constrained NLP**: The external NLP service does not extract entities and relationships freely. Instead, it is dynamically constrained by the platform's combined ontologies. At startup, the platform sends a complete list of all registered entity types (e.g., `Person`, `Investor`, `Deal`) and relationship types (e.g., `WORKS_FOR`, `INVESTED_IN`) to the NLP service. The Large Language Model (LLM) is then instructed to **only** use these predefined types, ensuring that all extracted data conforms to the system's knowledge model.

2.  **Multi-Labeling for Unified Identity**: A single real-world entity can have multiple roles across different domains. For example, "Vista Equity Partners" is both a generic `Organization` from the CRM perspective and a specific `Investor` from the financial perspective. To capture this, the system uses multi-labeling in the Neo4j graph. A node representing this entity will have both labels: `(:Investor:Organization)`.

3.  **Ontology Bridges**: The mapping between domain-specific types and core types is managed by **Ontology Bridges**. These are dedicated, injectable services that define the translation logic. For instance, the `FinancialToCrmBridge` contains the rule that an `Investor`, `Sponsor`, or `TargetCompany` should also be labeled as an `Organization`. This approach keeps the domain ontologies clean and decoupled while centralizing the integration logic.

### Example Flow

```
1. NLP receives text and a list of allowed types: ["Person", "Investor", "Organization", ...].
2. LLM extracts "Vista Equity Partners" and correctly classifies it as an `Investor`.
3. The ingestion script receives the `Investor` entity.
4. It consults the `FinancialToCrmBridge`.
5. The bridge returns the additional label: ["Organization"].
6. The script creates a node in Neo4j with both labels:
   MERGE (n:Investor:Organization {name: "Vista Equity Partners"})
```

This ensures that a simple query for all organizations (`MATCH (o:Organization)`) will correctly return all companies, investors, sponsors, and funds, providing a powerful, unified view of the data.

## 🎯 Quality Attributes

### Maintainability
- **Clear Boundaries**: Well-defined module responsibilities
- **Low Coupling**: Minimal inter-module dependencies
- **High Cohesion**: Related functionality grouped together
- **Documentation**: Comprehensive architectural documentation

### Testability
- **Unit Testing**: Domain logic in isolation
- **Integration Testing**: Cross-module interactions
- **End-to-End Testing**: Complete user workflows
- **Test Doubles**: Comprehensive mocking strategy

### Performance
- **Response Time**: <100ms for core operations
- **Throughput**: 1000+ requests/second
- **Resource Usage**: Efficient memory and CPU utilization
- **Scalability**: Linear scaling with load

---

**Next**: [Extension System Details](extensions.md) | [Data Flow Details](data-flow.md) 