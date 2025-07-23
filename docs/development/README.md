# Development Guide

This guide covers development setup, workflow, and best practices for the Dashboard Killer Graph platform.

## 🚀 **Quick Development Setup**

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Configure OPENAI_API_KEY and NEO4J_DATABASE

# 3. Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# 4. Launch development environment
./scripts/launch.sh

# 5. Open http://localhost:5173
```

## 🛠️ **Development Workflow**

### **Unified Script System**

The project uses unified, factorized scripts for all development operations:

```bash
# Launch development environment
./scripts/launch.sh [ontology] [ports...]

# Deploy services
./scripts/deploy.sh [service] [port]

# Test components
./scripts/test.sh [test_type]

# Manage ontologies
./scripts/ontologies.sh [action] [ontology]
```

### **Available Scripts**

| Script | Purpose | Example |
|--------|---------|---------|
| `launch.sh` | Launch development environment | `./scripts/launch.sh fibo` |
| `deploy.sh` | Deploy services | `./scripts/deploy.sh nlp` |
| `test.sh` | Test components | `./scripts/test.sh all` |
| `ontologies.sh` | Manage ontologies | `./scripts/ontologies.sh list` |

### **Common Development Commands**

```bash
# Launch with specific ontology
./scripts/launch.sh procurement

# Test all components
./scripts/test.sh all

# Validate ontology
./scripts/ontologies.sh validate fibo

# Deploy NLP service
./scripts/deploy.sh nlp 8000
```

## 🏗️ **Project Structure**

### **Core Directories**

```
src/
├── shared/                    # ✅ Unified shared utilities
│   ├── interfaces/           # Service interfaces
│   ├── utils/               # Common utilities
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
└── ontologies.sh           # ✅ Unified ontology management
```

### **Key Changes**

- **Unified Shared Directory**: All shared utilities consolidated in `src/shared/`
- **Factorized Scripts**: Common functions in `scripts/lib/common.sh`
- **Consistent Interface**: All scripts follow same CLI pattern

## 🧪 **Testing**

### **Test-Driven Development (TDD)**

The project follows strict TDD principles:

1. **RED**: Write failing test
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Clean up while maintaining tests

### **Running Tests**

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm test
```

### **Test Structure**

```
src/
├── __tests__/              # Co-located tests
├── platform/
│   └── __tests__/         # Platform tests
├── ingestion/
│   └── __tests__/         # Ingestion tests
└── shared/
    └── __tests__/         # Shared utility tests
```

## 🔧 **Development Tools**

### **TypeScript Configuration**

- **Base Config**: `config/tsconfig.base.json`
- **Path Aliases**: `@shared/`, `@platform/`, `@ingestion/`
- **Strict Mode**: Enabled for type safety

### **Code Quality**

```bash
# Type checking
npm run type-check

# Linting (temporarily disabled)
npm run lint

# Formatting
npm run format
```

### **Environment Variables**

```bash
# Required
OPENAI_API_KEY=sk-...        # OpenAI API key
NEO4J_DATABASE=procurement   # Target database

# Optional
LOG_LEVEL=INFO              # Logging level
ENABLE_PROMPT_DEBUG=0       # Debug prompts
MCP_ACTIVE_ONTOLOGIES=core  # Active ontologies
```

## 📦 **Service Architecture**

### **Services**

| Service | Port | Purpose |
|---------|------|---------|
| Chat UI | 5173 | React frontend |
| Backend API | 3001 | Node.js API |
| NLP Service | 8001 | Python/FastAPI |
| MCP Server | 3002 | Model Context Protocol |
| Neo4j | 7474/7687 | Graph database |

### **Development Workflow**

1. **Start Services**: `./scripts/launch.sh`
2. **Make Changes**: Edit source code
3. **Test Changes**: `./scripts/test.sh`
4. **Deploy**: `./scripts/deploy.sh` (if needed)

## 🎯 **Best Practices**

### **Code Organization**

- **Shared Code**: Use `@shared/` imports
- **Service Interfaces**: Define in `src/shared/interfaces/`
- **Utilities**: Place in `src/shared/utils/`
- **Types**: Define in `src/shared/types/`

### **Script Development**

- **Use Common Functions**: Import from `scripts/lib/common.sh`
- **Follow CLI Pattern**: `[action] [target] [options]`
- **Provide Help**: Include `--help` support
- **Error Handling**: Use shared error functions

### **Testing**

- **Co-locate Tests**: Place near source files
- **Mock Dependencies**: Use Jest mocks
- **Test Interfaces**: Focus on behavior
- **Follow AAA**: Arrange, Act, Assert

## 🚀 **Deployment**

### **Development Deployment**

```bash
# Deploy all services
./scripts/deploy.sh all

# Deploy specific service
./scripts/deploy.sh nlp 8000
```

### **Production Deployment**

```bash
# Use production compose
docker-compose -f docker-compose.production.yml up -d
```

## 📚 **Additional Resources**

- **[Architecture Overview](../architecture/overview.md)** - System design
- **[Ontology Guide](../architecture/ontologies.md)** - Domain extensions
- **[API Reference](../features/api-reference.md)** - Service APIs
- **[Scripts Guide](../../scripts/README.md)** - Unified scripts
- **[Testing Guide](./testing/README.md)** - Test strategies 