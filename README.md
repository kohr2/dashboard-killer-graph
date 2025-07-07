# Knowledge Graph Platform

**An ontology-driven platform** that uses knowledge graphs and Large Language Models to transform business data into conversational insights.

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd dashboard-killer-graph
npm install

# 2. Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY

# 3. Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# 4. Start the platform
npm run dev

# 5. Start chat UI (optional)
cd chat-ui && npm run dev

# 6. Start MCP server for Claude Desktop (optional)
npm run dev:mcp
```

## 🎯 Access Points

- **API Server**: http://localhost:3001
- **Chat UI**: http://localhost:5173
- **Neo4j Browser**: http://localhost:7474 (neo4j/password)
- **MCP Server**: Connects to Claude Desktop

## �️ Architecture

The platform uses a **modular ontology-driven architecture**:

```
Platform Core (Framework)
├── Ontology System (CRM, Financial, Procurement)
├── Knowledge Graph (Neo4j)
├── NLP Processing (Python FastAPI)
├── Chat Interface (React)
└── MCP Server (Claude Desktop)
```

### Core Components
- **Ontology System**: Dynamic loading of domain-specific ontologies
- **Knowledge Graph**: Neo4j-based graph database with vector search
- **NLP Processing**: OpenAI-powered entity extraction and reasoning
- **Chat Interface**: Natural language queries with conversational UI
- **MCP Integration**: Claude Desktop connection for AI assistance

## 🔧 Key Features

### ✅ Implemented
- **Multi-Ontology Support**: CRM, Financial, Procurement, FIBO ontologies
- **Entity Extraction**: AI-powered NLP with spaCy and OpenAI
- **Graph Database**: Neo4j with vector search capabilities
- **Chat Interface**: React-based conversational UI
- **MCP Server**: Claude Desktop integration
- **Email Processing**: Parse .eml files and extract entities
- **Test Coverage**: 70+ test files with Jest framework

### 🔄 In Progress
- **Test Dependencies**: Jest configuration needs fixing
- **Advanced Analytics**: Complex graph queries and aggregations
- **User Authentication**: Multi-user support

## 📚 Documentation

**Core Documentation:**
- **[Complete Documentation Hub](./docs/README.md)** - All documentation
- **[Architecture Overview](./docs/architecture/ontology-plugin-architecture.md)** - System design
- **[Development Guide](./docs/development/tdd-approach.md)** - TDD approach
- **[API Reference](./docs/development/api-reference.md)** - Available endpoints

**Quick References:**
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Pipeline Guidelines](./PIPELINE_GUIDELINES.md)** - Data processing pipeline

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js, TypeScript, Express |
| **Frontend** | React, TypeScript, Vite |
| **Database** | Neo4j Graph Database |
| **AI/NLP** | OpenAI GPT-4, Python FastAPI, spaCy |
| **Testing** | Jest, Supertest |
| **DevOps** | Docker, GitHub Actions |

## 🎮 Common Commands

### Development
```bash
# Start development server
npm run dev

# Start with NLP services
npm run dev:all

# Start chat interface
cd chat-ui && npm run dev
```

### Database
```bash
# Start Neo4j
npm run graph:start

# Stop Neo4j
npm run graph:stop

# View logs
npm run graph:logs
```

### Testing
```bash
# Run tests (after fixing dependencies)
npm install ts-jest @types/jest
npm test

# Type checking
npm run type-check
```

### Ontology Management
```bash
# Generate ontology code
npm run ontologies:generate

# Build specific ontology
npx ts-node scripts/ontology/build-ontology.ts --ontology-name procurement
```

## 🚨 Current Issues

1. **Test Dependencies**: Jest configuration needs `ts-jest` installation
2. **Documentation**: Some outdated information in detailed docs
3. **Environment Setup**: Missing `.env.example` file

## 🤝 Contributing

1. Follow [Test-Driven Development](./docs/development/tdd-approach.md)
2. Use [Conventional Commits](https://www.conventionalcommits.org/)
3. See [Contributing Guide](./CONTRIBUTING.md) for details

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with Clean Architecture, Domain-Driven Design, and Test-Driven Development principles** 