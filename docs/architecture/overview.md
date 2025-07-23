# Architecture Overview

The Dashboard Killer Graph platform is built as an **ontology-driven, extensible system** that provides a framework for domain-specific knowledge graph applications.

## 🏗️ **System Architecture**

### **High-Level Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat UI       │    │   Backend API   │    │   NLP Service   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Python)      │
│   Port: 5173    │    │   Port: 3001    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Neo4j Graph   │
                       │   Database      │
                       │   Port: 7474    │
                       └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │   MCP Server    │
                       │   (Node.js)     │
                       │   Port: 3002    │
                       └─────────────────┘
```

### **Core Components**

| Component | Technology | Purpose | Port |
|-----------|------------|---------|------|
| **Chat UI** | React | Conversational interface | 5173 |
| **Backend API** | Node.js/TypeScript | Business logic & orchestration | 3001 |
| **NLP Service** | Python/FastAPI | Entity extraction & LLM integration | 8001 |
| **MCP Server** | Node.js | Model Context Protocol for AI agents | 3002 |
| **Neo4j** | Graph Database | Knowledge graph storage | 7474/7687 |

## 📁 **Code Organization**

### **Unified Directory Structure**

```
src/
├── shared/                    # ✅ Unified shared utilities
│   ├── interfaces/           # Service interfaces
│   │   ├── advanced-graph.interface.ts
│   │   ├── content-processing.interface.ts
│   │   ├── email-parsing.interface.ts
│   │   └── ontology.interface.ts
│   ├── utils/               # Common utilities
│   │   ├── logger.ts        # Unified logging
│   │   ├── console-to-logger.ts
│   │   └── wait-for-service.ts
│   ├── types/               # Shared types
│   │   └── base-entity.ts
│   └── index.ts             # Comprehensive exports
├── ingestion/               # Data ingestion pipeline
│   ├── pipeline/            # Ingestion orchestration
│   ├── sources/             # Data sources
│   ├── services/            # Ingestion services
│   └── types/               # Ingestion types
├── platform/                # Core platform services
│   ├── ontology/            # Ontology management
│   ├── processing/          # Data processing
│   ├── enrichment/          # Data enrichment
│   ├── database/            # Database operations
│   └── chat/                # Chat functionality
├── mcp/                     # Model Context Protocol
│   ├── servers/             # MCP server implementations
│   └── clients/             # MCP client utilities
└── api.ts                   # Main API entry point
```

### **Key Architectural Principles**

1. **Ontology Agnostic**: Core platform independent of specific domains
2. **Extensible**: New domains added via ontology plugins
3. **Unified Shared Code**: Single source of truth for common utilities
4. **Service Separation**: Clear boundaries between components
5. **Test-Driven**: Comprehensive test coverage

## 🔧 **Unified Script System**

### **Script Architecture**

```
scripts/
├── lib/
│   └── common.sh            # ✅ Shared script functions (464 lines)
│       ├── Logging functions
│       ├── Prerequisite checks
│       ├── Service management
│       ├── Configuration utilities
│       └── Error handling
├── launch.sh               # ✅ Unified launcher
├── deploy.sh               # ✅ Unified deployment
├── test.sh                 # ✅ Unified testing
├── ontologies.sh           # ✅ Unified ontology management
└── [legacy scripts]        # ❌ Deprecated
```

### **Script Benefits**

- **Consistency**: Single interface for similar operations
- **Maintainability**: Shared functions reduce duplication
- **Flexibility**: Configurable ports and settings
- **Usability**: Comprehensive help and error handling

## 🎯 **Data Flow**

### **Ingestion Pipeline**

```
1. Data Source (Email/Dataset)
   ↓
2. Ingestion Pipeline
   ├── Email Processing
   ├── Entity Extraction
   └── Data Normalization
   ↓
3. Ontology Validation
   ├── Entity Type Mapping
   ├── Relationship Validation
   └── Schema Compliance
   ↓
4. Graph Database
   ├── Node Creation
   ├── Relationship Creation
   └── Index Updates
```

### **Query Processing**

```
1. User Query (Natural Language)
   ↓
2. NLP Service
   ├── Intent Recognition
   ├── Entity Extraction
   └── Query Understanding
   ↓
3. Backend API
   ├── Query Translation
   ├── Graph Traversal
   └── Result Aggregation
   ↓
4. Response Generation
   ├── Data Formatting
   ├── Context Enrichment
   └── Natural Language Response
```

## 🔌 **Ontology System**

### **Ontology Structure**

```
ontologies/
├── procurement/            # Procurement domain
│   ├── config.json        # Domain configuration
│   ├── ontology.json      # Entity/relationship schema
│   ├── procurement.plugin.ts
│   └── data/              # Domain-specific data
├── fibo/                  # Financial domain
├── geonames/              # Geographic domain
├── isco/                  # Occupational domain
├── sp500/                 # Market domain
└── testont/               # Test domain
```

### **Ontology Plugin Interface**

```typescript
interface OntologyPlugin {
  name: string;
  entities: EntityDefinition[];
  relationships: RelationshipDefinition[];
  config: OntologyConfig;
}
```

## 🔐 **Security & Configuration**

### **Environment Configuration**

```bash
# Required
OPENAI_API_KEY=sk-...        # LLM integration
NEO4J_DATABASE=procurement   # Target database

# Optional
LOG_LEVEL=INFO              # Logging verbosity
ENABLE_PROMPT_DEBUG=0       # Debug mode
MCP_ACTIVE_ONTOLOGIES=core  # Active ontologies
```

### **Service Communication**

- **Internal APIs**: RESTful HTTP APIs
- **External APIs**: OpenAI, enrichment services
- **Database**: Neo4j Bolt protocol
- **MCP**: Model Context Protocol for AI agents

## 🚀 **Deployment Architecture**

### **Development Environment**

```bash
# Single command launch
./scripts/launch.sh [ontology] [ports...]

# Example
./scripts/launch.sh procurement 8001 3001 5173 3002
```

### **Production Environment**

```bash
# Docker-based deployment
./scripts/deploy.sh all

# Or individual services
./scripts/deploy.sh nlp 8000
./scripts/deploy.sh mcp 3002
```

## 📊 **Performance & Scalability**

### **Current Capabilities**

- **Concurrent Users**: 10-50 (development)
- **Data Volume**: 10K-100K entities
- **Response Time**: <2 seconds for queries
- **Uptime**: 99%+ (production)

### **Scaling Considerations**

- **Horizontal Scaling**: Stateless services
- **Database Scaling**: Neo4j clustering
- **Caching**: Redis for frequent queries
- **Load Balancing**: Nginx for production

## 🔄 **Development Workflow**

### **Unified Development Process**

1. **Setup**: `./scripts/launch.sh`
2. **Develop**: Edit source code
3. **Test**: `./scripts/test.sh all`
4. **Deploy**: `./scripts/deploy.sh [service]`
5. **Validate**: `./scripts/ontologies.sh validate [ontology]`

### **Quality Assurance**

- **Test-Driven Development**: Strict TDD workflow
- **Type Safety**: TypeScript strict mode
- **Code Quality**: ESLint + Prettier
- **Documentation**: Comprehensive guides

## 📚 **Related Documentation**

- **[Development Guide](../development/README.md)** - Setup and workflow
- **[Ontology Guide](./ontologies.md)** - Domain extensions
- **[API Reference](../features/api-reference.md)** - Service APIs
- **[Scripts Guide](../../scripts/README.md)** - Unified scripts
- **[Testing Guide](../development/testing/README.md)** - Test strategies 