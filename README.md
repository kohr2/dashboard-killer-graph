# 🧠 Conversational Knowledge Platform (The Dashboard Killer)

[![CI/CD](https://github.com/your-org/dashboard-killer-graph/workflows/test/badge.svg)](https://github.com/your-org/dashboard-killer-graph/actions)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](./docs/testing/coverage-report.md)
[![Architecture](https://img.shields.io/badge/architecture-modular-brightgreen.svg)](./docs/architecture/overview.md)
[![PRD](https://img.shields.io/badge/PRD-available-blue.svg)](./PRD.md)

An **ontology-driven, extensible platform** that uses a knowledge graph and Large Language Models (LLMs) to replace traditional dashboards with intelligent, conversational insights.

Instead of being a monolithic application, this project is a **core platform** that provides a framework for building and running independent, domain-specific **ontology extensions**.

## 📋 Product Requirements Document

For detailed product specifications, requirements, and roadmap, see our comprehensive [Product Requirements Document (PRD)](./PRD.md).

The PRD covers:
- **Product Vision & Mission**: Strategic direction and success metrics
- **Functional Requirements**: Core features, extension system, and advanced capabilities
- **Technical Requirements**: Architecture, technology stack, and performance specifications
- **User Experience**: Chat interface, query experience, and multi-database support
- **Implementation Phases**: Current status and future roadmap
- **Success Criteria**: Technical, user, and business success metrics

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

# 4. Start the main API server
npm run dev

# 5. Start the Chat UI (in a separate terminal)
cd chat-ui && npm run dev

# 6. Start the MCP Server for Claude Desktop (optional, in a separate terminal)
npm run dev:mcp  # Currently configured for procurement-only
```

## 🎯 Access Points

- **Chat UI**: http://localhost:5173/ (or 5174 if 5173 is busy)
- **API Server**: http://localhost:3001
- **Neo4j Browser**: http://localhost:7474 (username: neo4j, password: password)
- **MCP Server**: Connects to Claude Desktop for AI-powered queries

## 🗄️ Database Configuration

The system supports multiple Neo4j databases for different use cases:

### Environment Variables
```bash
# Database configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=fibo  # Target database name
```

### Available Databases
- **`procurement`**: Public procurement data (current default)
- **`fibo`**: Financial Industry Business Ontology data
- **`dashboard-killer`**: Default application database
- **`neo4j`**: System default database

### Switching Databases
To change the target database for chat queries:

1. **Via Environment File** (recommended):
   ```bash
   # Edit .env file
   NEO4J_DATABASE=procurement  # Current default
   ```

2. **Via Environment Variable**:
   ```bash
   export NEO4J_DATABASE=procurement
   npm run dev
   ```

3. **Runtime Configuration**: The system automatically connects to the configured database and creates it if it doesn't exist.

## 🏛️ Architecture: Platform + Extensions

The system is composed of a central **Platform** and multiple **Extensions**.

```
      +-------------------------+
      |      Platform Core      |
      | (Framework, Tooling)    |
      +-----------+-------------+
                  |
+-----------------+-----------------+-----------------+
|                 |                 |                 |
+-----------------+-------+ +-------+-------+ +-------+-----------------+
|   CRM Ontology Extension  | | Financial Ontology Ext. | | Procurement Ontology Ext. | | GeoNames Ontology Ext. |
| (Contacts, Orgs)        | | (Deals, Investments)    | | (Contracts, Tenders)      | | (Cities, Countries)     |
+-------------------------+ +-------------------------+ +-------------------------+
```

### Platform Core Components
- **Extension Registry**: Dynamic discovery and loading of ontology extensions
- **Chat Service**: Natural language processing and query translation
- **Database Layer**: Neo4j connection management with multi-database support
- **Security Service**: Role-based access control and permissions
- **Reasoning Engine**: Multi-domain intelligence algorithms
- **MCP Integration**: Claude Desktop connectivity and tool access

### Ontology Extensions
Each extension is a self-contained module that defines a specific business domain:
- **Data Model**: `ontology.json` with entities, relationships, and properties
- **Business Logic**: Domain-specific services and processing
- **Validation**: Entity and relationship validation rules
- **Documentation**: Domain-specific documentation and examples

Extensions are automatically discovered and loaded by the plugin registry, making the platform truly ontology-agnostic.

This modular design allows new capabilities to be added without modifying the core platform.

## 🎯 Current Implementation Highlights

### ✅ Core Platform Features
- **Ontology-Agnostic Chat**: Works with any ontology without hardcoded domain logic
- **Multi-Database Support**: Seamless switching between different Neo4j databases
- **Dynamic Extension Loading**: New ontologies can be added without platform changes
- **Compact Ontology Format**: 98% size reduction for efficient LLM interaction
- **MCP Integration**: Full Claude Desktop integration with tool access
- **Email Ingestion**: Unified processing with AI-powered entity extraction

### 🔧 Technical Architecture
- **Clean Architecture**: Separation of concerns with dependency injection
- **Microservices**: Python NLP service, Node.js API, React UI
- **Test-Driven Development**: 235+ passing tests with comprehensive coverage
- **Performance Optimized**: Query optimization and database indexing
- **Security**: Role-based access control and API security

### 📊 Available Ontologies
- **Procurement**: 227 entities, 595 relationships (European procurement data)
- **FIBO**: Financial Industry Business Ontology (organizations, instruments)
- **GeoNames**: 159,045 cities from 195+ countries (geographic data)
- **ISCO**: International Standard Classification of Occupations
- **S&P 500**: Market data and company information
- **CRM**: Customer relationship management

## 💬 Chat System

The platform includes a powerful **ontology-agnostic chat system** that can work with any ontology. The chat system reads actual ontology configurations and provides intelligent conversational access to your knowledge graph.

### 🚀 Quick Start

```bash
# List all available ontologies
npm run chat:list

# Launch chat with specific ontology
npm run chat:procurement    # Procurement & tendering data
npm run chat:fibo          # Financial Industry Business Ontology
npm run chat:geonames      # Geographic and location data
npm run chat:isco          # Occupational classifications
npm run chat:sp500         # S&P 500 companies and market data

# Launch all services together
npm run chat:all
```

### 🏗️ Ontology-Agnostic Features

- ✅ **No hardcoded ontology logic** - Works with any ontology automatically
- ✅ **Dynamic configuration** - Reads from actual ontology `config.json` files
- ✅ **Real metadata display** - Shows entity counts, descriptions, versions
- ✅ **Multiple databases** - Each ontology can use its own database
- ✅ **Natural language queries** - "show all contracts", "list all buyers"
- ✅ **Multi-language support** - Works in English, French, and other languages
- ✅ **Rich responses** - Uses OpenAI to format results naturally
- ✅ **Real-time data** - Queries live data from Neo4j knowledge graph

### 📋 Available NPM Commands

```bash
# Chat launchers
npm run chat:launch        # Smart launcher with prompts
npm run chat:procurement   # Direct procurement chat
npm run chat:fibo         # Direct FIBO chat
npm run chat:geonames     # Direct GeoNames chat
npm run chat:isco         # Direct ISCO chat
npm run chat:sp500        # Direct S&P 500 chat

# Individual services
npm run chat:ui           # Just the React chat interface
npm run chat:backend      # Just the Node.js API backend
npm run chat:nlp          # Just the Python NLP service
npm run chat:all          # All services together

# Discovery
npm run chat:list         # List all available ontologies
```

### Example Queries by Ontology

**Procurement** (Current Default): "show all contracts", "list all buyers", "find tenders related to [company]"
**FIBO**: "show all organizations", "list all deals", "find companies related to [company]"
**GeoNames**: "show all cities", "list all countries", "find locations in [country]"
**ISCO**: "show all occupations", "list all job categories", "find skills related to [occupation]"
**S&P 500**: "show all companies", "list all stocks", "find companies in [sector]"

### Chat API Endpoints
```bash
# Send a chat query
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "show all organizations"}'

# Response format
{
  "response": "Here are the organizations found:\n\n1. **Vista Equity Partners**\n   - ID: vista_equity_partners\n\n2. **Morgan Stanley**\n   - ID: morgan_stanley\n..."
}
```

📖 **For detailed chat system documentation, see [Chat System Guide](./docs/features/chat-system-guide.md)**

## 📚 Documentation

### 📋 Product & Planning
-   [**Product Requirements Document (PRD)**](./PRD.md) - Comprehensive product specifications and requirements
-   [**Development Roadmap**](./docs/development/roadmap.md) - Detailed development planning and milestones
-   [**TODO & Future Plans**](./TODO.md) - Current priorities and upcoming features

### 🏗️ Architecture & Design
-   [**Complete Documentation Hub**](./docs/README.md) - Start here for all documentation
-   [**Architecture Overview**](./docs/architecture/overview.md) - High-level system design
-   [**Extension & Ontology Architecture**](./docs/architecture/ontologies.md) - Guide to create and manage extensions

### 🚀 User Guides
-   [**Chat Interface Guide**](./docs/features/chat-interface.md) - How to use the conversational interface
-   [**Entity Extraction Guide**](./docs/architecture/entity-extraction-guide.md) - How the NLP pipeline works

### 👨‍💻 Developer Resources
-   [**API Reference**](./docs/development/api-reference.md) - Available API endpoints
-   [**Logger Guidelines**](./docs/development/logger-guidelines.md) - Using the common logger and console patch
-   [**TDD Approach**](./docs/development/tdd-approach.md) - Test-driven development guidelines

## 🎯 Project Status

### ✅ Completed (Phase 1)
-   [x] **Platform Core**: Modular framework for extension loading and orchestration
-   [x] **Ontology-Driven Design**: Extensions built around central `ontology.json` files
-   [x] **Plugin Architecture**: Dynamic plugin discovery and registration system
-   [x] **Chat Interface**: Fully functional conversational UI with natural language processing
-   [x] **Query Translation**: OpenAI-powered translation from natural language to structured queries
-   [x] **Knowledge Graph Integration**: Real-time queries to Neo4j database
-   [x] **Multi-language Support**: Works in English, French, and other languages
-   [x] **Database Configuration**: Support for multiple Neo4j databases with proper session management
-   [x] **Dependency Injection**: Proper service initialization with tsyringe container
-   [x] **MCP Server**: Integration with Claude Desktop for AI-powered assistance
-   [x] **Multiple Ontology Extensions**: 
    - Procurement (227 entities, 595 relationships)
    - FIBO (Financial Industry Business Ontology)
    - GeoNames (159,045 cities from 195+ countries)
    - ISCO (Occupational classifications)
    - S&P 500 (Market data and companies)
    - CRM (Customer relationship management)
-   [x] **Compact Ontology Format**: 98% size reduction for efficient LLM interaction
-   [x] **Automated Code Generation**: Ontology-to-code generation with plugin templates
-   [x] **TDD Foundation**: Comprehensive test structure with Jest (235+ passing tests)
-   [x] **Unified Email Ingestion**: Comprehensive email processing system with ontology-specific and bulk processing modes

### 🔧 Recent Fixes & Improvements
-   [x] **Chat Service Database Selection**: Fixed to use configured database instead of default
-   [x] **Query Translator Validation**: Fixed entity type validation bug in QueryTranslator
-   [x] **Service Initialization**: Proper dependency injection setup for chat services
-   [x] **Session Management**: Correct Neo4j session handling with database specification
-   [x] **Performance Optimization**: Query optimization and database indexing improvements
-   [x] **Error Handling**: Enhanced error messages and recovery mechanisms

### 🔄 In Progress (Phase 2)
-   [ ] **Advanced Email Processing**: Enhanced entity extraction and relationship inference
-   [ ] **Reasoning Engine**: Multi-domain reasoning algorithms and pattern detection
-   [ ] **MCP Integration Refinements**: Enhanced Claude Desktop integration
-   [ ] **Performance Monitoring**: Advanced observability and performance tuning

### 📋 Planned (Phase 3)
-   [ ] **Advanced Query Types**: Support for complex aggregations and analytics
-   [ ] **User Authentication**: Multi-user support with role-based access control
-   [ ] **Agentic Workflows**: AI agents that can reason across different ontologies
-   [ ] **Advanced Analytics**: Business intelligence and reporting features

### 🚀 Future (Phase 4)
-   [ ] **Enterprise Features**: Multi-user support with advanced permissions
-   [ ] **Advanced Analytics**: Business intelligence and reporting features
-   [ ] **Performance Optimization**: Advanced scaling and optimization
-   [ ] **Enterprise Integrations**: Additional API integrations and connectors

See the [Development Roadmap](./docs/development/roadmap.md) for detailed planning and the [PRD](./PRD.md) for comprehensive requirements.

See the [Development Roadmap](./docs/development/roadmap.md) for more details.

## 📧 Email Ingestion

The platform includes a unified email ingestion system for processing emails with ontology-specific entity extraction:

```bash
# Process single ontology with generated email
npx ts-node scripts/demo/ingest-email.ts fibo --generate

# Process with custom email and build options
npx ts-node scripts/demo/ingest-email.ts procurement --email=./custom-email.eml --top-entities=20

# Bulk process emails from fixtures
npx ts-node scripts/demo/ingest-email.ts --folder=procurement/emails --ontology=procurement

# Process with database reset and limits
npx ts-node scripts/demo/ingest-email.ts --folder=emails --limit=10 --reset-db
```

### Features
- **Dual Mode Operation**: Ontology-specific and bulk processing modes
- **Build Options**: Configurable ontology building with entity/relationship limits
- **Flexible Input**: Generate emails, use existing fixtures, or specify custom files
- **Database Management**: Optional database reset and configuration
- **Rich CLI**: Comprehensive command-line interface

See [Scripts Documentation](./scripts/README.md#-unified-email-ingestion-script) for complete usage details.

## 🧪 Testing

```bash
# Run all unit and integration tests
npm test

# Run tests for a specific ontology extension
npm run lint:ontology:crm
npm run lint:ontology:financial

# Test chat functionality
npm run chat:test

# Test query translator
npx ts-node -r tsconfig-paths/register test-query-translator.ts

# Run email ingestion tests
npm test -- --testPathPattern=email-ingestion
```

## 🐞 Troubleshooting

### Common Issues

**Chat returns "I couldn't find any information"**
- Check that `NEO4J_DATABASE` is set to the correct database containing your data
- Verify the database exists and contains the expected entities
- Ensure the API server is using the correct database configuration

**Database connection issues**
- Verify Neo4j is running: `docker-compose -f docker-compose.neo4j.yml ps`
- Check connection settings in `.env` file
- Ensure database exists or will be created automatically

**OpenAI API errors**
- Verify `OPENAI_API_KEY` is set in `.env`
- Check API key validity and rate limits
- Review query translator logs for detailed error messages

## 🐞 Prompt & Ontology Debugging

The NLP micro-service can optionally persist every prompt it sends to OpenAI, along with the compact ontology JSON, to help you inspect and fine-tune the extraction pipeline.

| Environment Variable      | Default                | Description                                                       |
| ------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `ENABLE_PROMPT_DEBUG`     | `0`                    | Set to `1` to enable writing prompt and ontology files to disk.    |
| `PROMPT_DEBUG_DIR`        | `/tmp/llm-prompts`     | Directory where files are written. Can be absolute or relative.    |

Example:

```bash
# Enable prompt debugging in your terminal before starting the NLP service
export ENABLE_PROMPT_DEBUG=1
export PROMPT_DEBUG_DIR="$(pwd)/debug-prompts"
uvicorn python-services/nlp-service.main:app --host 0.0.0.0 --port 8000

# After running an ingestion you will find files like:
#   debug-prompts/compact-ontology-<timestamp>.json
#   debug-prompts/prompt-<timestamp>.txt
```

Disable by leaving `ENABLE_PROMPT_DEBUG` unset or set to `0` (the default).

## 🛠️ Tech Stack

| Layer                | Technologies                               |
| -------------------- | ------------------------------------------ |
| **Frontend**         | React, TypeScript, Vite                   |
| **Backend**          | Node.js, TypeScript, Express, tsyringe    |
| **Database**         | Neo4j (Graph Database)                     |
| **AI / NLP**         | OpenAI GPT-4o-mini, Python (FastAPI)      |
| **Testing**          | Jest                                       |
| **DevOps**           | Docker, GitHub Actions                     |

## 🤝 Contributing

This project follows a strict Test-Driven Development (TDD) approach. Please see our [TDD Guide](./docs/development/tdd-approach.md) before contributing. All contributions are welcome!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/dashboard-killer-graph/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/dashboard-killer-graph/discussions)

## 🎯 Summary

The Conversational Knowledge Platform represents a paradigm shift from traditional dashboards to intelligent, conversational interfaces for knowledge graph exploration. With its ontology-driven, extensible architecture, the platform provides:

- **🚀 Immediate Value**: Replace complex dashboards with natural language queries
- **🔧 True Extensibility**: Add new business domains without platform changes
- **🧠 AI-Powered Intelligence**: LLM-driven insights and natural language processing
- **📊 Multi-Domain Support**: Query across procurement, finance, geography, and more
- **🔒 Enterprise Ready**: Security, performance, and scalability built-in

### Getting Started
1. **Quick Start**: Follow the [Quick Start](#-quick-start) guide above
2. **Product Details**: Review the [Product Requirements Document](./PRD.md)
3. **Architecture**: Explore the [Architecture Overview](./docs/architecture/overview.md)
4. **Development**: Check the [Development Roadmap](./docs/development/roadmap.md)

### Contributing
This project follows Test-Driven Development (TDD) principles. See our [TDD Guide](./docs/development/tdd-approach.md) and [Contributing Guidelines](./CONTRIBUTING.md) for details.

---

**🎯 Built with ❤️ using Clean Architecture, DDD, and TDD principles** 