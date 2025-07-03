# Knowledge Graph Dashboard

A comprehensive knowledge graph platform for processing and analyzing business communications, documents, and data with ontology-driven intelligence.

## Quick Overview

The Knowledge Graph Dashboard ingests, processes, and analyzes data from various sources to build a rich knowledge graph. Supports email processing, document analysis, entity extraction, and ontology-driven reasoning with a focus on financial, CRM, and procurement domains.

## Key Features

- **Email Processing**: Parse .eml files with attachment support and entity extraction
- **AI-Powered Entity Recognition**: Advanced NLP-based entity extraction with ontology mapping
- **Ontology-Driven Reasoning**: Multi-domain reasoning algorithms for business intelligence
- **Knowledge Graph**: Neo4j-based graph database with vector search capabilities
- **Chat Interface**: Natural language querying with context awareness
- **Vector Search**: Similarity-based entity matching and semantic search
- **MCP Server**: Claude Desktop integration for AI-powered queries
- **Test-Driven Development**: Comprehensive test suite with 235+ passing tests

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

# Start Python NLP services (optional - system works without them)
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

### Ontology Management

The system includes an ontology-agnostic builder for managing domain ontologies:

```bash
# Build procurement ontology from ePO source
npx ts-node scripts/ontology/build-ontology.ts procurement

# Build any ontology by name
npx ts-node scripts/ontology/build-ontology.ts <ontology-name>

# Build from specific config file
npx ts-node scripts/ontology/build-ontology.ts --config path/to/config.json

# Generate code from ontologies
npx ts-node scripts/codegen/generate-ontologies.ts procurement
npx ts-node scripts/codegen/generate-ontologies.ts  # Generate all ontologies
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

# Process test emails (28 test emails included)
npm run pipeline:email

# Test reasoning algorithms
npm run demo:reasoning

# Start chat interface
npm run chat:dev

# Run full test suite
npm test
```

## System Status

### ✅ Current Status (Latest Release)
- **Build**: Zero compilation errors
- **Tests**: 235/236 passing (99.6% success rate)
- **Email Pipeline**: Fully functional with 28 test emails
- **Ontologies**: 4 domains loaded (Core, CRM, Financial, Procurement)
- **Database**: Neo4j with vector search working
- **MCP Integration**: Claude Desktop integration active
- **Ontology Builder**: Ontology-agnostic builder with OWL/RDF support

### Recent Improvements
- **Ontology-Agnostic Builder**: Plugin-based architecture supporting FIBO, O-CREAM, and ePO
- **Procurement Ontology**: Built complete procurement ontology (148 entities, 395 relationships)
- **Enhanced Codegen**: Adapted for new JSON format with rich property extraction
- **Real Source Integration**: OWL/RDF parsing with XML namespace handling
- **Comprehensive Testing**: Full test suite for ontology builder and parser
- **Removed Date/Time entities** to prevent conflicts with JavaScript Date type
- **Enhanced test coverage** with comprehensive mock objects
- **Fixed AsyncIterable handling** in email source tests
- **Improved code generation** templates for better entity inheritance
- **Reorganized test structure** for better maintainability

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
                       │   Plugin        │
                       │   Registry      │
                       ├─────────────────┤
                       │ • Auto-discovery│
                       │ • Dynamic loading│
                       │ • Configuration │
                       └─────────────────┘
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
├── ingestion/          # Data ingestion pipeline (refactored)
├── ontologies/         # Domain ontologies (crm, financial, procurement)
├── mcp/               # MCP server for Claude Desktop integration
├── shared/             # Shared utilities and logging
└── types/              # TypeScript types

test/
├── fixtures/           # Test data (emails, documents)
│   └── emails/         # 28 test email files
└── setup/              # Test configuration

scripts/
├── pipeline/           # Pipeline demo scripts
├── database/           # Database management scripts
└── demo/               # Demo and testing scripts
```

### Core Components

1. **Platform Services** (`src/platform/`)
   - **Processing**: Content processing and entity extraction
   - **Ontology**: Ontology management and validation
   - **Reasoning**: Ontology-driven reasoning algorithms
   - **Chat**: Natural language interface
   - **Database**: Neo4j connection management
   - **Enrichment**: Entity enrichment services (EDGAR, Salesforce)

2. **Domain Ontologies** (`ontologies/`)
   - **Core**: Generic entities (Communication, Fund, Sponsor, Event, Document, Process)
   - **CRM**: Customer relationship management (Contact, Organization)
   - **Financial**: Financial domain entities (Investor, Deal, MonetaryAmount, etc.)
   - **Procurement**: Procurement and supply chain (148 entities, 395 relationships)
   - **Plugin Registry**: Automatic discovery and loading of ontology plugins

3. **Ontology Builder** (`scripts/ontology/`)
   - **Ontology-Agnostic CLI**: Plugin-based architecture for any ontology source
   - **OWL/RDF Support**: FIBO, O-CREAM, ePO ontology parsing
   - **Real Source Integration**: Live ontology extraction and validation
   - **Code Generation**: Automatic entity, repository, service, and DTO generation

3. **MCP Server** (`src/mcp/`)
   - **Claude Desktop Integration**: Direct query access
   - **Query Translation**: Natural language to Cypher queries
   - **Schema Exposure**: Dynamic schema representation

4. **Ingestion Pipeline** (`src/ingestion/`)
   - **Sources**: Data source adapters (email, documents, APIs)
   - **Pipeline**: Generic ingestion pipeline with ontology support
   - **Services**: Email ingestion and processing services
   - **Types**: Data source interfaces and normalized data types

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

## Plugin Registration System

The platform uses a dynamic plugin registry that automatically discovers and loads ontology plugins from the `ontologies/` directory.

### Key Features
- **Auto-Discovery**: Automatically finds ontology plugins in the `ontologies/` directory
- **Dynamic Loading**: Loads plugins without requiring manual registration
- **Runtime Management**: Enable/disable plugins without restarting the application
- **Error Resilience**: Continues operation even if some plugins fail to load
- **Configuration Management**: Supports custom plugin configurations

### Plugin Status
| Plugin | Status | Entities | Relationships | Auto-Discovery |
|--------|--------|----------|---------------|----------------|
| Core | ✅ Enabled | 3 | 0 | ✅ |
| CRM | ✅ Enabled | 15+ | 20+ | ✅ |
| Financial | ✅ Enabled | 25+ | 30+ | ✅ |
| Procurement | ✅ Enabled | 148 | 395 | ✅ |

### Plugin Management
```typescript
import { getEnabledPlugins, getPluginSummary } from '../config/ontology/plugins.config';

// Get plugin status
const summary = getPluginSummary();
console.log('Enabled plugins:', summary.enabled);

// Load plugins into ontology service
const enabledPlugins = getEnabledPlugins();
ontologyService.loadFromPlugins(enabledPlugins);
```

For detailed information, see [Plugin Registration System](./architecture/plugin-registration-system.md).

## Ontologies

Domain-specific ontologies define entities, relationships, and reasoning algorithms.

### Core Ontology
The core ontology contains generic entities used across all domains:
- **Communication**: Generic communication entity with properties like `subject`, `content`, `timestamp`
- **Fund**: Investment funds and portfolios
- **Sponsor**: Investment sponsors and firms
- **Event**: Business events and meetings
- **Document**: Business documents and files
- **Process**: Business processes and workflows

### Domain Ontologies
- **CRM**: Contact, Organization with relationship management
- **Financial**: Investor, Deal, MonetaryAmount, and financial domain entities
- **Procurement**: Supplier, Contract, Purchase, Category (disabled by default)

### Ontology Structure
```json
{
  "name": "financial",
  "source": "https://spec.edmcouncil.org/fibo/",
  "dependencies": ["crm"],
  "entities": {
    "Investor": {
      "description": "An entity that provides capital for investment purposes",
      "properties": {
        "name": "string",
        "type": "string",
        "aum": "number",
        "investmentFocus": "string[]",
        "geographicFocus": "string[]"
      },
      "keyProperties": ["name", "type"],
      "vectorIndex": true
    }
  },
  "relationships": {
    "INVESTS_IN": {
      "description": "Investment relationship between entities",
      "properties": {
        "amount": "number",
        "date": "string",
        "type": "string"
      }
    }
  }
}
```

## Processing Pipeline

### Email Processing
1. **Parsing**: Extract email content and metadata using mailparser
2. **Entity Extraction**: AI-powered entity recognition with spaCy integration
3. **Ontology Mapping**: Map entities to domain ontologies with validation
4. **Graph Storage**: Store in Neo4j with vector embeddings for similarity search

### Entity Types
- **Company/Organization**: Business organizations
- **Person**: Individual people
- **Location**: Geographic locations
- **MonetaryAmount**: Financial values and amounts
- **Deal**: Investment and business deals
- **Document**: Business documents and communications

## Reasoning Engine

### Algorithm Types
- **Pattern Recognition**: Find investment patterns and trends
- **Anomaly Detection**: Identify unusual data patterns
- **Recommendation Engine**: Suggest similar entities and opportunities
- **Relationship Analysis**: Analyze entity connections and networks

### Domain-Specific Reasoning
- **Financial**: Investment opportunities, market analysis, deal flow
- **CRM**: Lead scoring, relationship analysis, contact management
- **Procurement**: Supplier analysis, cost optimization, contract management

## Testing

### Test Coverage
- **235/236 tests passing** (99.6% success rate)
- **37 test suites** covering all major components
- **Comprehensive mock objects** for external dependencies
- **Integration tests** for email processing pipeline
- **Unit tests** for all services and utilities

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=email
npm test -- --testPathPattern=ontology
npm test -- --testPathPattern=pipeline

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

#### Neo4j Connection
```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Restart Neo4j
docker-compose -f docker-compose.neo4j.yml restart

# Check Neo4j logs
docker-compose -f docker-compose.neo4j.yml logs neo4j
```

#### Python NLP Service
```bash
# Check if Python services are running
ps aux | grep python

# Restart NLP service
cd python-services/nlp-service
python main.py &

# Note: System works without NLP services (optional)
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
# Test with included test emails
npm run pipeline:email

# Check email file format
file test/fixtures/emails/your-email.eml

# Run email ingestion tests
npm test -- --testPathPattern=email-ingestion
```

#### Build Issues
```bash
# Clean and rebuild
npm run clean
npm install
npm run build

# Check TypeScript configuration
npx tsc --noEmit
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

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commit messages
- **TDD**: Test-driven development approach

### Architecture Principles
- **Modularity**: Domain-specific ontologies with clear boundaries
- **Extensibility**: Plugin-based architecture for new ontologies
- **Scalability**: Microservice approach for NLP and processing
- **Testability**: Comprehensive test coverage with TDD
- **Ontology Agnostic**: System handles multiple ontologies and data sources

### Development Workflow
```bash
# 1. Write failing test (TDD)
npm test -- --testPathPattern=your-feature

# 2. Implement feature
# 3. Make test pass
npm test

# 4. Refactor
npm run lint
npm run format

# 5. Commit with conventional commit
git commit -m "feat(domain): add new feature"
```

## Technology Stack

- **Backend**: Node.js 18+, TypeScript
- **Database**: Neo4j (graph database with vector search)
- **NLP**: Python spaCy microservice (optional)
- **Vector Search**: Neo4j vector indexes for similarity search
- **MCP**: Model Context Protocol for Claude Desktop integration
- **Architecture**: Domain-driven design with hexagonal architecture
- **Testing**: Jest with comprehensive test coverage
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## Roadmap

### Current Version (v1.0) ✅
- ✅ Email processing with attachments and entity extraction
- ✅ Ontology-driven entity mapping and validation
- ✅ Knowledge graph with vector search capabilities
- ✅ Multi-domain reasoning engine with algorithms
- ✅ Chat interface for natural language queries
- ✅ MCP server for Claude Desktop integration
- ✅ Comprehensive test suite (235+ tests)
- ✅ Financial, CRM, and procurement ontologies

### Short Term (v1.1) 🔄
- 🔄 Real-time processing and streaming
- 🔄 Advanced NLP improvements and custom models
- 📋 Document processing (PDF, Word, Excel)
- 📋 API integrations for external data sources
- 📋 Enhanced reasoning algorithms

### Medium Term (v1.2) 🎯
- 🎯 Interactive graph visualization dashboard
- 🎯 Business intelligence and analytics dashboards
- 🎯 Mobile support and responsive design
- 🎯 Multi-tenant architecture and user management
- 🎯 Advanced entity linking and disambiguation

### Long Term (v2.0) 🚀
- 🚀 Advanced AI assistant with learning capabilities
- 🚀 Predictive analytics and forecasting
- 🚀 Enterprise features and security enhancements
- 🚀 Cloud deployment and scaling
- 🚀 Advanced graph algorithms and machine learning

## Support

- **Documentation**: This README and `/docs` directory contain comprehensive information
- **Issues**: Create GitHub issues for bugs and feature requests
- **Development**: Follow TDD principles and established code standards
- **Architecture**: Domain-driven design with hexagonal architecture
- **Testing**: Maintain high test coverage and quality standards

## 🔗 Related Documentation

- **Documentation**: This README and `/docs` directory contain comprehensive information
- **Issues**: Create GitHub issues for bugs and feature requests
- **Development**: Follow TDD principles and established code standards
- **Architecture**: Domain-driven design with hexagonal architecture
- **Testing**: Maintain high test coverage and quality standards
- **System Status**: [Current System Status](development/system-status.md)

## Recent Changes

### Latest Release (Current)
- **Removed Date/Time entities** from financial ontology to prevent conflicts
- **Enhanced test coverage** with comprehensive mock objects
- **Fixed AsyncIterable handling** in email source tests
- **Improved code generation** templates for better entity inheritance
- **Reorganized test structure** for better maintainability
- **Updated build configuration** for better TypeScript support
- **Enhanced documentation** with current system status and improvements 