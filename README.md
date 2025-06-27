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

# 2. Start Core Infrastructure
# This starts Neo4j.
docker-compose -f docker-compose.neo4j.yml up -d

# 3. Start AI Service (in a separate terminal)
# For entity extraction, the Python NLP service must be running.
# First time setup:
npm run setup:nlp
# Start the service:
npm run start:nlp

# 4. Run the demo ingestion script
# This script processes sample emails and builds the knowledge graph.
npm run demo:ingest

# 5. Run tests
npm test
```

## 🏛️ Architecture: Platform + Extensions

The system is composed of a central **Platform** and multiple **Extensions**.

```
      +-------------------------+
      |      Platform Core      |
      | (Framework, Tooling)    |
      +-----------+-------------+
                  |
+-----------------+-----------------+
|                 |                 |
+-----------------+-------+ +-------+-----------------+
|   CRM Ontology Extension  | | Financial Ontology Ext. |
| (Contacts, Orgs)        | | (Deals, Investments)    |
+-------------------------+ +-------------------------+
```

-   **Platform Core**: Provides the essential services: extension loading, knowledge graph connection (Neo4j), conversational interface, and shared tools. It is domain-agnostic.
-   **Ontology Extensions**: Self-contained modules that define a specific business domain (e.g., CRM, Finance). Each extension contributes its own data model (`ontology.json`), business logic, and services to the platform.

This modular design allows new capabilities to be added without modifying the core platform.

## 📚 Documentation

-   [**Architecture Overview**](./docs/architecture/overview.md) - High-level system design.
-   [**Extension & Ontology Architecture**](./docs/architecture/ontologies.md) - A guide on how to create and manage extensions.
-   [**API Reference**](./docs/development/api-reference.md) - A guide to the available API endpoints.
-   [**Entity Extraction Guide**](./docs/architecture/entity-extraction-guide.md) - How the NLP pipeline works.
-   [**Development Roadmap**](./docs/development/roadmap.md) - See what's next.

## 🎯 Project Status

### ✅ Completed
-   [x] **Platform Core**: Modular framework for extension loading and orchestration.
-   [x] **Ontology-Driven Design**: Extensions are built around a central `ontology.json` file.
-   [x] **High-Performance Ingestion**: A batch pipeline for processing documents in parallel.
-   [x] **CRM & Financial Extensions**: Foundational extensions for CRM and Finance domains.
-   [x] **TDD Foundation**: Comprehensive test structure with Jest.

### 📋 Next Steps
-   **API Development**: Build a generic API layer to expose extension services.
-   **Conversational UI**: Create the chat interface for interacting with the knowledge graph.
-   **Agentic Workflows**: Develop AI agents that can reason across different ontologies.

See the [Development Roadmap](./docs/development/roadmap.md) for more details.

## 🧪 Testing

```bash
# Run all unit and integration tests
npm test

# Run tests for a specific ontology extension
npm run lint:ontology:crm
npm run lint:ontology:financial
```

## 🛠️ Tech Stack

| Layer                | Technologies                               |
| -------------------- | ------------------------------------------ |
| **Application Logic**| Node.js, TypeScript, tsyringe (DI)         |
| **Database**         | Neo4j (Graph Database)                     |
| **AI / NLP**         | Python (FastAPI), spaCy, OpenAI            |
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