# Knowledge Graph Platform Documentation

A comprehensive knowledge graph platform for processing and analyzing business data with ontology-driven intelligence.

## Quick Overview

The Knowledge Graph Platform ingests, processes, and analyzes data from various sources to build a rich knowledge graph. It supports email processing, entity extraction, and ontology-driven reasoning for business intelligence.

## Key Features

- **Email Processing**: Parse .eml files with entity extraction
- **AI-Powered Entity Recognition**: NLP-based entity extraction with ontology mapping
- **Ontology-Driven System**: Multi-domain ontologies (CRM, Financial, Procurement, FIBO)
- **Knowledge Graph**: Neo4j-based graph database with vector search
- **Chat Interface**: Natural language querying
- **MCP Server**: Claude Desktop integration
- **Test Coverage**: 70+ test files with Jest framework

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Python 3.8+ (for NLP services)

### Installation

```bash
# Install and setup
git clone <repository-url>
cd dashboard-killer-graph
npm install

# Start services
docker-compose -f docker-compose.neo4j.yml up -d

# Start Python NLP service (optional)
cd python-services/nlp-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py &

# Start application
npm run dev
```

## Ontology Management

The system includes comprehensive ontology management with intelligent filtering based on business relevance.

### Basic Ontology Operations

```bash
# Build procurement ontology
npx ts-node scripts/ontology/build-ontology.ts --ontology-name procurement

# Build with importance filtering
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 50 --top-relationships 50

# Generate code from ontologies
npx ts-node scripts/codegen/generate-ontologies.ts procurement
```

### Supported Ontologies

- **FIBO (Financial)**: Legal entities, financial instruments, bonds, shares
- **Procurement (ePO)**: Contracts, tenders, suppliers, awards
- **CRM**: Leads, opportunities, accounts, contacts
- **Financial**: Deals, investments, portfolios, transactions

### Features

- **LLM-Powered Analysis**: AI-driven importance ranking
- **Transparency**: Full visibility into filtered entities
- **Flexible Configuration**: Customizable filtering and output options

## MCP Server (Claude Desktop Integration)

Enable Claude Desktop to query your knowledge graph directly.

### Setup

```bash
# Start MCP server
npm run dev:mcp

# Configure Claude Desktop
# Add server: llm-orchestrator
# Command: node /path/to/project/src/mcp/servers/mcp-server-simple.js
```

### Usage

Ask Claude questions like:
- "Show me all deals for the company 'BlueWave'"
- "Find contacts related to the deal 'Project Alpha'"
- "List companies in the technology sector"

## Email Processing

Comprehensive email fixture generation and processing system.

### Generate Test Emails

```bash
# Generate procurement emails
npx ts-node scripts/fixtures/generate-email-fixtures.ts --ontology=procurement --count=100

# Generate financial emails
npx ts-node scripts/fixtures/generate-email-fixtures.ts --ontology=financial --count=50
```

### Process Emails

```bash
# Process all email fixtures
npm run pipeline:email

# Process specific folders
npm run pipeline:email -- --folder=procurement/emails
```

## Testing

### Current Status
- **70+ test files** with Jest framework
- **Test dependencies**: Need `ts-jest` installation for proper execution
- **Coverage**: Comprehensive unit and integration tests

### Run Tests

```bash
# Fix dependencies first
npm install ts-jest @types/jest

# Run tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
```

## Common Commands

### Development
```bash
npm run dev              # Start development server
npm run dev:all          # Start with NLP services
cd chat-ui && npm run dev # Start chat interface
```

### Database
```bash
npm run graph:start      # Start Neo4j
npm run graph:stop       # Stop Neo4j
npm run graph:logs       # View logs
```

### Code Generation
```bash
npm run ontologies:generate  # Generate ontology code
npm run type-check          # Type checking
```

## Architecture

### Core Components
- **Platform Core**: Framework for ontology loading and orchestration
- **Ontology System**: Dynamic plugin discovery and registration
- **Chat Interface**: React-based conversational UI with NLP
- **Knowledge Graph**: Neo4j database with vector search
- **MCP Server**: Claude Desktop integration
- **NLP Processing**: Python FastAPI services with OpenAI

### Tech Stack
- **Backend**: Node.js, TypeScript, Express
- **Frontend**: React, TypeScript, Vite
- **Database**: Neo4j Graph Database
- **AI/NLP**: OpenAI GPT-4, Python FastAPI, spaCy
- **Testing**: Jest, Supertest
- **DevOps**: Docker, GitHub Actions

## Current Issues

1. **Test Dependencies**: Jest configuration needs `ts-jest`
2. **Environment Setup**: Missing `.env.example` file
3. **Documentation**: Some outdated information in detailed docs

## Development Guidelines

1. Follow [Test-Driven Development](./development/tdd-approach.md)
2. Use [Conventional Commits](https://www.conventionalcommits.org/)
3. See [Contributing Guide](../CONTRIBUTING.md) for details

## Documentation Structure

### Architecture
- **[Ontology Plugin Architecture](./architecture/ontology-plugin-architecture.md)** - Plugin system
- **[Entity Extraction Guide](./architecture/entity-extraction-guide.md)** - NLP pipeline
- **[MCP Server Architecture](./architecture/mcp-server-architecture.md)** - Claude integration

### Development
- **[TDD Approach](./development/tdd-approach.md)** - Testing methodology
- **[System Status](./development/system-status.md)** - Current system health
- **[Ontology Scripts](./development/ontology-scripts.md)** - Ontology management

### Features
- **[Enhanced Entity Extraction](./features/enhanced-entity-extraction.md)** - Advanced NLP capabilities

## Troubleshooting

### Common Issues
- **Neo4j Connection**: Check Docker containers with `docker ps`
- **Python Services**: Services are optional; system works without them
- **MCP Server**: Ensure correct paths in Claude Desktop configuration
- **Tests**: Install `ts-jest` for proper test execution

### Debug Commands
```bash
# Check service health
curl http://localhost:3001/api/health
curl http://localhost:8000/health

# Check Neo4j status
docker-compose -f docker-compose.neo4j.yml logs neo4j
```

---

**For comprehensive documentation, see individual files in the `docs/` directory.** 