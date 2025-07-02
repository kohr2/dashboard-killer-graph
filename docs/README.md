# Knowledge Graph Dashboard

A comprehensive knowledge graph platform for processing and analyzing business communications, documents, and data.

## Quick Overview

The Knowledge Graph Dashboard ingests, processes, and analyzes data from various sources to build a rich knowledge graph. Supports email processing, document analysis, entity extraction, and ontology-driven reasoning.

## Key Features

- **Email Processing**: Parse .eml files with attachment support
- **Entity Extraction**: AI-powered entity recognition
- **Ontology-Driven Reasoning**: Multi-domain reasoning algorithms
- **Knowledge Graph**: Neo4j-based graph database
- **Chat Interface**: Natural language querying
- **Vector Search**: Similarity-based entity matching
- **MCP Server**: Claude Desktop integration for AI-powered queries

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Python 3.8+ (for NLP services)
- Claude Desktop (for MCP integration)

### Installation

```bash
# Install and setup
git clone <repository-url>
cd dashboard-killer-graph-new
npm install
cp config/environment.example.js config/environment.js

# Start services
docker-compose -f docker-compose.neo4j.yml up -d

# Start Python NLP services
cd python-services/nlp-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py &

cd ../analysis-service
pip install -r requirements.txt
python main.py &

# Start application
npm run dev
```

### MCP Server Setup (Claude Desktop Integration)

The MCP server enables Claude Desktop to query your knowledge graph directly.

#### 1. Start the MCP Server
```bash
# In a separate terminal
npm run dev:mcp
```

#### 2. Configure Claude Desktop
1. Open Claude Desktop
2. Go to Settings → MCP Servers
3. Add a new server with these settings:
   - **Name**: `llm-orchestrator`
   - **Command**: `node`
   - **Arguments**: `["/path/to/your/project/src/mcp/servers/mcp-server-simple.js"]`
   - **Working Directory**: `/path/to/your/project`

#### 3. Test the Integration
In Claude Desktop, you can now ask questions like:
- "Show me all deals for the company 'BlueWave'"
- "Find contacts related to the deal 'Project Alpha'"
- "List companies in the technology sector"

#### Troubleshooting MCP
- **Server not found**: Ensure the MCP server is running (`npm run dev:mcp`)
- **Connection errors**: Check the file paths in Claude Desktop configuration
- **No response**: Verify Neo4j is running and accessible

### Quick Demo

```bash
# Initialize database schema
npm run db:init

# Process test emails
npm run demo:email-ingestion

# Test reasoning algorithms
npm run demo:reasoning

# Start chat interface
npm run chat:dev
```

## Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │    │  Processing     │    │   Knowledge     │
│                 │    │   Pipeline      │    │     Graph       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Email (.eml)  │───▶│ • Entity        │───▶│ • Neo4j         │
│ • Documents     │    │   Extraction    │    │   Database      │
│ • APIs          │    │ • Ontology      │    │ • Vector Search │
│ • Databases     │    │   Mapping       │    │ • Relationships │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Reasoning     │
                       │   Engine        │
                       ├─────────────────┤
                       │ • Multi-domain  │
                       │ • Algorithms    │
                       │ • API Endpoints │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   MCP Server    │
                       │ (Claude Desktop)│
                       └─────────────────┘
```

### Project Structure

```
src/
├── platform/           # Core services (processing, ontology, reasoning)
├── ontologies/         # Domain ontologies (crm, financial, procurement)
├── ingestion/          # Data ingestion pipeline
├── mcp/               # MCP server for Claude Desktop integration
├── shared/             # Shared utilities
└── types/              # TypeScript types
```

### Core Components

1. **Platform Services** (`src/platform/`)
   - **Processing**: Content processing and entity extraction
   - **Ontology**: Ontology management and validation
   - **Reasoning**: Ontology-driven reasoning algorithms
   - **Chat**: Natural language interface
   - **Database**: Neo4j connection management

2. **Domain Ontologies** (`src/ontologies/`)
   - **Core**: Generic entities (Communication, etc.)
   - **CRM**: Customer relationship management
   - **Financial**: Financial domain entities and relationships
   - **Procurement**: Procurement and supply chain

3. **MCP Server** (`src/mcp/`)
   - **Claude Desktop Integration**: Direct query access
   - **Query Translation**: Natural language to Cypher queries
   - **Schema Exposure**: Dynamic schema representation

4. **Ingestion Pipeline** (`src/ingestion/`)
   - **Sources**: Data source adapters (email, documents, APIs)
   - **Core**: Pipeline orchestration
   - **Intelligence**: AI and NLP services

## API Reference

### Base URL
```
http://localhost:3001/api
```

### Core Endpoints

#### Email Processing
```http
POST /email/process
{
  "filePath": "/path/to/email.eml"
}
```

#### Reasoning
```http
POST /reasoning/execute
{
  "ontology": "financial",
  "algorithm": "identify_investment_opportunities"
}
```

#### Chat Interface
```http
POST /chat/message
{
  "message": "Show me all investment opportunities",
  "context": { "sessionId": "uuid" }
}
```

#### Health Check
```http
GET /health
```

## Ontologies

Domain-specific ontologies define entities, relationships, and reasoning algorithms.

### Core Ontology
The core ontology contains generic entities used across all domains:
- **Communication**: Generic communication entity with properties like `subject`, `content`, `timestamp`

### Domain Ontologies
- **CRM**: Contact, Organization, Task
- **Financial**: Company, Deal, Investment, Market
- **Procurement**: Supplier, Contract, Purchase, Category

### Ontology Structure
```json
{
  "name": "financial",
  "entities": [
    {
      "name": "Company",
      "properties": ["name", "ticker", "industry"],
      "indexable": true,
      "relationships": ["INVESTS_IN", "COMPETES_WITH"]
    }
  ],
  "reasoning": [
    {
      "name": "identify_investment_opportunities",
      "cypher": "MATCH (c:Company) WHERE c.valuation < c.peers RETURN c"
    }
  ]
}
```

## Processing Pipeline

### Email Processing
1. **Parsing**: Extract email content and metadata
2. **Entity Extraction**: AI-powered entity recognition
3. **Ontology Mapping**: Map entities to domain ontologies
4. **Graph Storage**: Store in Neo4j with vector embeddings

### Entity Types
- **Company**: Business organizations
- **Person**: Individual people
- **Location**: Geographic locations
- **Date**: Temporal information
- **Amount**: Monetary values

## Reasoning Engine

### Algorithm Types
- **Pattern Recognition**: Find investment patterns
- **Anomaly Detection**: Identify unusual data
- **Recommendation Engine**: Suggest similar entities

### Domain-Specific Reasoning
- **Financial**: Investment opportunities, market analysis
- **CRM**: Lead scoring, relationship analysis
- **Procurement**: Supplier analysis, cost optimization

## Troubleshooting

### Common Issues

#### Neo4j Connection
```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Restart Neo4j
docker-compose -f docker-compose.neo4j.yml restart
```

#### Python NLP Service
```bash
# Check if Python services are running
ps aux | grep python

# Restart NLP service
cd python-services/nlp-service
python main.py &
```

#### MCP Server Issues
```bash
# Check if MCP server is running
ps aux | grep mcp-server

# Restart MCP server
npm run dev:mcp

# Check Claude Desktop configuration
# Ensure paths are correct and absolute
```

#### Email Processing
```bash
# Test with known working email
npm run demo:email-ingestion

# Check email file format
file test-emails/your-email.eml
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check service health
curl http://localhost:3001/api/health
curl http://localhost:8000/health
```

## Development

### Testing
```bash
# Run all tests
npm test

# Run specific tests
npm test -- --testPathPattern=email
```

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code quality
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commits
- **TDD**: Test-driven development

### Architecture Principles
- **Modularity**: Domain-specific ontologies
- **Extensibility**: Plugin-based architecture
- **Scalability**: Microservice approach for NLP
- **Testability**: TDD with comprehensive test coverage

## Technology Stack

- **Backend**: Node.js, TypeScript
- **Database**: Neo4j (graph database)
- **NLP**: Python spaCy microservice
- **Vector Search**: Neo4j vector indexes
- **MCP**: Model Context Protocol for Claude Desktop
- **Architecture**: Domain-driven design, hexagonal architecture

## Roadmap

### Current Version (v1.0)
- ✅ Email processing with attachments
- ✅ Entity extraction and ontology mapping
- ✅ Knowledge graph with vector search
- ✅ Reasoning engine with algorithms
- ✅ Chat interface for queries
- ✅ MCP server for Claude Desktop

### Short Term (v1.1)
- 🔄 Real-time processing
- 🔄 Advanced NLP improvements
- 📋 Document processing (PDF, Word, Excel)
- 📋 API integrations

### Medium Term (v1.2)
- 🎯 Interactive graph visualization
- 🎯 Business intelligence dashboards
- 🎯 Mobile support
- 🎯 Multi-tenant architecture

### Long Term (v2.0)
- 🚀 Advanced AI assistant
- 🚀 Predictive analytics
- 🚀 Enterprise features
- 🚀 Cloud deployment

## Support

- **Documentation**: This README contains all essential information
- **Issues**: Create GitHub issues for bugs
- **Development**: Follow TDD principles and code standards
- **Architecture**: Domain-driven design with hexagonal architecture 