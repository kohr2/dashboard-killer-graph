# 🧠 Conversational Knowledge Platform (The Dashboard Killer)

[![CI/CD](https://github.com/your-org/dashboard-killer-graph/workflows/test/badge.svg)](https://github.com/your-org/dashboard-killer-graph/actions)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](./docs/testing/coverage-report.md)
[![Architecture](https://img.shields.io/badge/architecture-modular-brightgreen.svg)](./docs/architecture/overview.md)
[![PRD](https://img.shields.io/badge/PRD-available-blue.svg)](./PRD.md)

An **ontology-driven, extensible platform** that uses a knowledge graph and Large Language Models (LLMs) to replace traditional dashboards with intelligent, conversational insights.

Instead of being a monolithic application, this project is a **core platform** that provides a framework for building and running independent, domain-specific **ontology extensions**.

## 📋 Product Requirements Document

For detailed product specifications, requirements, and roadmap, see our comprehensive [Product Requirements Document (PRD)](./PRD.md).

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/dashboard-killer-graph.git
cd dashboard-killer-graph
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and configure:
# - OPENAI_API_KEY (required for chat functionality)
# - NEO4J_DATABASE (set to your target database, e.g., 'fibo')

# 3. Start Neo4j Database
docker-compose -f docker-compose.neo4j.yml up -d

# 4. Launch the system
./scripts/launch.sh

# 5. Open your browser to http://localhost:5173
```

## 🎯 **Unified Scripts (Recommended)**

The project now uses unified, factorized scripts for all operations:

### **Launch System**
```bash
# Launch with default configuration (procurement)
./scripts/launch.sh

# Launch specific ontology
./scripts/launch.sh fibo

# Launch with custom ports
./scripts/launch.sh procurement 8002 3002 5174 3003
```

### **Deploy Services**
```bash
# Deploy NLP service
./scripts/deploy.sh nlp

# Deploy MCP server
./scripts/deploy.sh mcp 3002

# Deploy all services
./scripts/deploy.sh all
```

### **Test Components**
```bash
# Test all components
./scripts/test.sh all

# Test specific component
./scripts/test.sh neo4j
```

### **Manage Ontologies**
```bash
# List all ontologies
./scripts/ontologies.sh list

# Validate ontology
./scripts/ontologies.sh validate procurement
```

**All scripts provide comprehensive help:**
```bash
./scripts/launch.sh --help
./scripts/deploy.sh --help
./scripts/test.sh --help
./scripts/ontologies.sh --help
```

## 🏗️ **Project Structure**

```
src/
├── shared/                    # ✅ Unified shared utilities
│   ├── interfaces/           # Service interfaces
│   ├── utils/               # Common utilities (logger, etc.)
│   ├── types/               # Shared types
│   └── index.ts             # Comprehensive exports
├── ingestion/               # Data ingestion pipeline
├── platform/                # Core platform services
├── mcp/                     # Model Context Protocol
└── api.ts                   # Main API entry point

scripts/
├── lib/common.sh            # ✅ Shared script functions
├── launch.sh               # ✅ Unified launcher
├── deploy.sh               # ✅ Unified deployment
├── test.sh                 # ✅ Unified testing
├── ontologies.sh           # ✅ Unified ontology management
└── [legacy scripts]        # ❌ Deprecated

ontologies/
├── procurement/            # Procurement domain
├── fibo/                  # Financial domain
├── geonames/              # Geographic domain
├── isco/                  # Occupational domain
├── sp500/                 # Market domain
└── testont/               # Test domain
```

## 🔧 **Key Features**

### **Ontology-Driven Architecture**
- **Extensible**: Add new domains via ontology plugins
- **Agnostic**: Core platform independent of specific domains
- **Configurable**: Rich configuration system for each ontology

### **Unified Script System**
- **Consistent**: Single interface for similar operations
- **Maintainable**: Shared functions reduce duplication
- **Flexible**: Configurable ports and settings

### **Multi-Service Architecture**
- **NLP Service**: Python/FastAPI for entity extraction
- **Backend API**: Node.js/TypeScript for business logic
- **Chat UI**: React for conversational interface
- **MCP Server**: Model Context Protocol for AI integration

## 📚 **Documentation**

- **[Architecture Overview](./docs/architecture/overview.md)** - System design and components
- **[Development Guide](./docs/development/README.md)** - Setup and development workflow
- **[Ontology Guide](./docs/architecture/ontologies.md)** - Creating and managing ontologies
- **[API Reference](./docs/features/api-reference.md)** - Service APIs and endpoints
- **[Scripts Guide](./scripts/README.md)** - Unified script system documentation

## 🚀 **Quick Examples**

### **Launch Different Ontologies**
```bash
# Procurement domain
./scripts/launch.sh procurement

# Financial domain
./scripts/launch.sh fibo

# Geographic domain
./scripts/launch.sh geonames
```

### **Deploy for Production**
```bash
# Deploy all services
./scripts/deploy.sh all

# Deploy specific service
./scripts/deploy.sh nlp 8000
```

### **Test System Components**
```bash
# Test everything
./scripts/test.sh all

# Test specific component
./scripts/test.sh mcp
```

## 🤝 **Contributing**

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, including our Test-Driven Development approach.

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 