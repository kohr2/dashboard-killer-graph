# 🧠 Conversational Knowledge Platform (The Dashboard Killer)

[![CI/CD](https://github.com/your-org/dashboard-killer-graph/workflows/test/badge.svg)](https://github.com/your-org/dashboard-killer-graph/actions)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](./docs/testing/coverage-report.md)
[![Architecture](https://img.shields.io/badge/architecture-modular-brightgreen.svg)](./docs/architecture/overview.md)

An **ontology-driven, extensible platform** that uses a knowledge graph and Large Language Models (LLMs) to replace traditional dashboards with intelligent, conversational insights.

Instead of being a monolithic application, this project is a **core platform** that provides a framework for building and running independent, domain-specific **ontology extensions**.

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
npm run dev:mcp
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
- **`fibo`**: Financial Industry Business Ontology data
- **`dashboard-killer`**: Default application database
- **`neo4j`**: System default database

### Switching Databases
To change the target database for chat queries:

1. **Via Environment File** (recommended):
   ```bash
   # Edit .env file
   NEO4J_DATABASE=fibo
   ```

2. **Via Environment Variable**:
   ```bash
   export NEO4J_DATABASE=fibo
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
|   CRM Ontology Extension  | | Financial Ontology Ext. | | Procurement Ontology Ext. |
| (Contacts, Orgs)        | | (Deals, Investments)    | | (Contracts, Tenders)      |
+-------------------------+ +-------------------------+ +-------------------------+
```

-   **Platform Core**: Provides the essential services: extension loading, knowledge graph connection (Neo4j), conversational interface, and shared tools. It is domain-agnostic.
-   **Ontology Extensions**: Self-contained modules that define a specific business domain (e.g., CRM, Finance, Procurement). Each extension contributes its own data model (`ontology.json`), business logic, and services to the platform. Extensions are automatically discovered and loaded by the plugin registry.

This modular design allows new capabilities to be added without modifying the core platform.

## 💬 Chat Interface Features

The system includes a fully functional conversational interface that:

- ✅ **Natural Language Processing**: Understands queries like "show me all deals" or "list all people"
- ✅ **Multi-language Support**: Works in English, French, and other languages
- ✅ **Entity Recognition**: Recognizes synonyms (people/persons, deals/projects)
- ✅ **Relationship Queries**: Can find related entities ("show organizations related to Rick")
- ✅ **Rich Responses**: Uses OpenAI to format results in natural language
- ✅ **Real-time Data**: Queries live data from Neo4j knowledge graph
- ✅ **Database-aware**: Automatically queries the configured database
- ✅ **Dependency Injection**: Proper service initialization and dependency management

### Example Queries
```
"show all deals"
"list all people"
"show me organizations"
"find contacts related to Thoma Bravo"
"show me all persons"
"trouve moi les entreprises" (French)
"show all Organization" (explicit entity type)
```

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

## 📚 Documentation

-   [**Complete Documentation Hub**](./docs/README.md) - Start here for all documentation
-   [**Architecture Overview**](./docs/architecture/overview.md) - High-level system design
-   [**Chat Interface Guide**](./docs/features/chat-interface.md) - How to use the conversational interface
-   [**Extension & Ontology Architecture**](./docs/architecture/ontologies.md) - Guide to create and manage extensions
-   [**API Reference**](./docs/development/api-reference.md) - Available API endpoints
-   [**Entity Extraction Guide**](./docs/architecture/entity-extraction-guide.md) - How the NLP pipeline works
-   [**Logger Guidelines**](./docs/development/logger-guidelines.md) - Using the common logger and console patch
-   [**Development Roadmap**](./docs/development/roadmap.md) - What's next
-   [**TDD Approach**](./docs/development/tdd-approach.md) - Test-driven development guidelines

## 🎯 Project Status

### ✅ Completed
-   [x] **Platform Core**: Modular framework for extension loading and orchestration.
-   [x] **Ontology-Driven Design**: Extensions are built around a central `ontology.json` file.
-   [x] **Plugin Architecture**: Dynamic plugin discovery and registration system.
-   [x] **Chat Interface**: Fully functional conversational UI with natural language processing.
-   [x] **Query Translation**: OpenAI-powered translation from natural language to structured queries.
-   [x] **Knowledge Graph Integration**: Real-time queries to Neo4j database.
-   [x] **Multi-language Support**: Works in English, French, and other languages.
-   [x] **Database Configuration**: Support for multiple Neo4j databases with proper session management.
-   [x] **Dependency Injection**: Proper service initialization with tsyringe container.
-   [x] **MCP Server**: Integration with Claude Desktop for AI-powered assistance.
-   [x] **CRM & Financial Extensions**: Foundational extensions for CRM and Finance domains.
-   [x] **Procurement Extension**: Public procurement ontology with 227 entities and 595 relationships.
-   [x] **Compact Ontology & Prompt Partitioning**: New compact ontology format (≈ 98 % size reduction) and partitioned prompt generation for efficient LLM interaction. Entity (`e`) and relationship (`r`) lists are now alphabetically sorted for deterministic diffing.
-   [x] **Automated Code Generation**: Ontology-to-code generation with plugin templates.
-   [x] **TDD Foundation**: Comprehensive test structure with Jest.

### 🔧 Recent Fixes
-   [x] **Chat Service Database Selection**: Fixed ChatService to use configured database instead of default
-   [x] **Query Translator Validation**: Fixed entity type validation bug in QueryTranslator
-   [x] **Service Initialization**: Proper dependency injection setup for chat services
-   [x] **Session Management**: Correct Neo4j session handling with database specification

### 📋 Next Steps
-   **Advanced Query Types**: Support for complex aggregations and analytics.
-   **User Authentication**: Multi-user support with role-based access control.
-   **Agentic Workflows**: Develop AI agents that can reason across different ontologies.
-   **Email Processing**: Automated entity extraction from email attachments.

See the [Development Roadmap](./docs/development/roadmap.md) for more details.

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

---

**🎯 Built with ❤️ using Clean Architecture, DDD, and TDD principles** 