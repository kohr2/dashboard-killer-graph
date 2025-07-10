# Knowledge Graph Dashboard

A comprehensive knowledge graph platform for processing and analyzing business communications, documents, and data with ontology-driven intelligence.

## Quick Overview

The Knowledge Graph Dashboard ingests, processes, and analyzes data from various sources to build a rich knowledge graph. Supports email processing, document analysis, entity extraction, and ontology-driven reasoning with a focus on financial, CRM, and procurement domains.

## Key Features

- **Email Processing**: Parse .eml files with attachment support and entity extraction
- **AI-Powered Entity Recognition**: Advanced NLP-based entity extraction with ontology mapping
- **Ontology-Driven Reasoning**: Multi-domain reasoning algorithms for business intelligence
- **Knowledge Graph**: Neo4j-based graph database with vector search capabilities
- **Chat Interface**: Natural language querying with context awareness and multi-database support
- **Vector Search**: Similarity-based entity matching and semantic search
- **MCP Server**: Claude Desktop integration for AI-powered queries
- **Multi-Database Support**: Switch between different Neo4j databases for different use cases
- **Test-Driven Development**: Comprehensive test suite with 235+ passing tests

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Python 3.8+ (for NLP services)
- Claude Desktop (for MCP integration)
- OpenAI API Key (for chat functionality)

### Installation

```bash
# Install and setup
git clone <repository-url>
cd dashboard-killer-graph-new
npm install
cp config/environment.example.js config/environment.js

# Configure environment
echo "OPENAI_API_KEY=your_key_here" >> .env
echo "NEO4J_DATABASE=fibo" >> .env

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

# Test chat interface
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "show all organizations"}'
```

### Database Configuration

The system supports multiple Neo4j databases for different use cases:

```bash
# Switch to financial database (default)
echo "NEO4J_DATABASE=fibo" >> .env

# Switch to procurement database
echo "NEO4J_DATABASE=procurement" >> .env

# Switch to CRM database
echo "NEO4J_DATABASE=crm" >> .env

# Restart application after database change
npm run dev
```

**Available Databases:**
- `fibo` - Financial Industry Business Ontology (Organizations, Instruments, Legal Entities)
- `procurement` - European Procurement Ontology (Contracts, Tenders, Suppliers)
- `crm` - Customer Relationship Management (Leads, Opportunities, Accounts)
- `dashboard-killer` - Default application database

### Ontology Management

The system includes an ontology-agnostic builder for managing domain ontologies with advanced filtering and importance-based selection.

#### Basic Ontology Building

```bash
# Build procurement ontology from ePO source
npx ts-node scripts/ontology/build-ontology.ts --ontology-name procurement

# Build any ontology by name
npx ts-node scripts/ontology/build-ontology.ts --ontology-name <ontology-name>

# Build from specific config file
npx ts-node scripts/ontology/build-ontology.ts --config-path path/to/config.json

# Generate code from ontologies
npx ts-node scripts/codegen/generate-ontologies.ts procurement
npx ts-node scripts/codegen/generate-ontologies.ts  # Generate all ontologies
```

#### Advanced Ontology Processing with Importance-Based Filtering

The ontology builder now supports intelligent filtering based on business relevance and semantic significance:

```bash
# Build FIBO ontology with 50 most important entities and relationships
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 50 --top-relationships 50

# Build with 100 limits for more comprehensive coverage
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 100 --top-relationships 100

# Include external imports (not recommended for production)
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 50 --include-external

# Custom output directory
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 50 --output-dir ./custom-output
```

#### Importance-Based Filtering Features

**LLM-Powered Analysis:**
- Uses AI to analyze entity and relationship importance
- Considers business relevance, semantic significance, and operational impact
- Falls back to heuristic analysis when LLM endpoints unavailable

**Transparency and Tracking:**
- `ignoredEntities`: Array of filtered-out entity names
- `ignoredRelationships`: Array of filtered-out relationship names
- Full visibility into what was excluded during processing

**Output Files:**
- `source.ontology.json`: Raw extraction with ignored items lists
- `ontology.json`: Final processed ontology with overrides applied

#### Supported Ontologies

**FIBO (Financial Industry Business Ontology):**
```bash
# Process full FIBO ontology with intelligent filtering
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 100 --top-relationships 100
```
- **Source**: EDM Council GitHub repository
- **Coverage**: Legal entities, corporations, financial instruments, bonds, shares
- **Features**: Recursive import processing, namespace-agnostic parsing
- **Output**: 100 most important entities and relationships from 612 total

**Procurement (ePO):**
```bash
# Process procurement ontology
npx ts-node scripts/ontology/build-ontology.ts --ontology-name procurement
```
- **Source**: European Procurement Ontology
- **Coverage**: Contracts, tenders, suppliers, awards
- **Features**: Multi-language support, regulatory compliance

**Financial:**
```bash
# Process financial ontology
npx ts-node scripts/ontology/build-ontology.ts --ontology-name financial
```
- **Source**: Custom financial domain ontology
- **Coverage**: Deals, investments, portfolios, transactions

**CRM:**
```bash
# Process CRM ontology
npx ts-node scripts/ontology/build-ontology.ts --ontology-name crm
```
- **Source**: Customer relationship management ontology
- **Coverage**: Leads, opportunities, accounts, contacts

#### Ontology Processing Pipeline

1. **Source Fetching**: Downloads ontology files from configured sources
2. **Import Resolution**: Recursively processes owl:imports for comprehensive coverage
3. **Entity Extraction**: Parses OWL classes and RDF descriptions
4. **Relationship Extraction**: Processes OWL object properties
5. **Importance Analysis**: Uses LLM or heuristics to rank by business relevance
6. **Filtering**: Keeps top N entities and relationships based on importance
7. **Deduplication**: Removes duplicate entities and relationships by name
8. **Output Generation**: Creates source and final ontology files

#### Configuration Options

**Command Line Arguments:**
- `--ontology-name`: Name of ontology to process
- `--config-path`: Path to custom configuration file
- `--top-entities`: Number of most important entities to keep
- `--top-relationships`: Number of most important relationships to keep
- `--include-external`: Include external imports (default: false)
- `--output-dir`: Custom output directory

**Configuration File Structure:**
```json
{
  "name": "ontology-name",
  "source": {
    "url": "https://example.com/ontology.rdf",
    "type": "owl",
    "version": "1.0.0",
    "description": "Ontology description"
  },
  "extraction": {
    "entities": {
      "path": "//owl:Class",
      "name": "@rdf:about",
      "description": "//rdfs:comment/text()"
    },
    "relationships": {
      "path": "//owl:ObjectProperty",
      "name": "@rdf:about",
      "description": "//rdfs:comment/text()"
    }
  },
  "overrides": {
    "entities": {},
    "relationships": {}
  },
  "metadata": {
    "lastExtraction": "2024-01-01T00:00:00.000Z",
    "sourceVersion": "1.0.0",
    "localVersion": "1.0.0"
  }
}
```

#### Example: Processing FIBO with 100 Limits

```bash
# Process FIBO ontology with comprehensive coverage
npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo --top-entities 100 --top-relationships 100
```

**Output:**
- **Entities kept**: 100 (from 612 total)
- **Relationships kept**: 100 (from 612 total)
- **Entities ignored**: 512 (listed in source.ontology.json)
- **Relationships ignored**: 512 (listed in source.ontology.json)

**Sample Extracted Content:**
- **Entities**: JointStockCompany, PrivatelyHeldCompany, BenefitCorporation, Bond, Share, etc.
- **Relationships**: hasDateOfRegistration, hasRegisteredAddress, hasBaseCurrency, etc.

#### Troubleshooting Ontology Processing

**Common Issues:**
```bash
# Check if ontology config exists
ls ontologies/<ontology-name>/config.json

# Verify source URL accessibility
curl -I <ontology-source-url>

# Check TypeScript compilation
npx tsc --noEmit scripts/ontology/build-ontology.ts

# Run with debug logging
DEBUG=* npx ts-node scripts/ontology/build-ontology.ts --ontology-name fibo
```

**LLM Service Issues:**
- System gracefully falls back to heuristic analysis
- No LLM service required for basic functionality
- Check logs for fallback warnings

**Import Processing:**
- Large ontologies may take time to process
- Monitor memory usage for very large imports
- Use `--include-external` sparingly to avoid processing irrelevant imports

### MCP Server Setup (Claude Desktop Integration)

The MCP server provides ontology-agnostic Claude Desktop integration.

#### 1. Start the MCP Server

```bash
# Default (all enabled ontologies)
npm run dev:mcp

# Specific ontologies
MCP_ACTIVE_ONTOLOGIES=financial,crm npm run dev:mcp

# Configure database + ontologies
NEO4J_DATABASE=fibo MCP_ACTIVE_ONTOLOGIES=fibo npm run dev:mcp
```

#### 2. Configure Claude Desktop
1. Open Claude Desktop → Settings → MCP Servers
2. Add server:
   - **Name**: `llm-orchestrator`
   - **Command**: `node`
   - **Arguments**: `["/path/to/your/project/src/mcp/servers/mcp-server-simple.js"]`
   - **Working Directory**: `/path/to/your/project`

#### 3. Example Queries

The server adapts to your ontology configuration:

- **Financial**: `"show all LegalEntity"`, `"find organizations"`
- **CRM**: `"show all Person"`, `"list contacts"`
- **FIBO**: `"show all FinancialInstrument"`
- **Multi-domain**: `"find deals for Morgan Stanley"`

#### Troubleshooting
- **No response**: Check Neo4j is running and MCP server is started
- **Wrong entities**: Verify `MCP_ACTIVE_ONTOLOGIES` and `ontology.json` files

### Quick Demo

```bash
# Initialize database schema
npm run db:init

# Process test emails (100+ test emails available)
npm run pipeline:email

# Process specific email folders
npm run pipeline:email -- --folder=procurement/emails
npm run pipeline:email -- --folder=financial/emails

# Generate new email fixtures
npx ts-node -P config/tsconfig.base.json scripts/fixtures/generate-email-fixtures.ts --ontology=procurement --count=50

# Test reasoning algorithms
npm run demo:reasoning

# Start chat interface
npm run chat:dev

# Run full test suite
npm test
```

## Email Fixtures

The system includes a comprehensive email fixture generation system that creates realistic test emails for different ontologies.

### Features
- **LLM-Powered Generation**: Uses OpenAI GPT-3.5 to generate realistic email content
- **Fake People Names**: Includes realistic sender and recipient names with professional titles
- **Multi-Ontology Support**: Supports procurement, financial, CRM, legal, healthcare, and FIBO ontologies
- **Dynamic Ontology Loading**: Loads entity information from `source.ontology.json` files
- **Realistic Email Addresses**: Generates vendor-specific email domains
- **Professional Signatures**: Includes proper business signatures with titles

### Generating Email Fixtures

```bash
# Generate procurement emails (requires OPENAI_API_KEY)
npx ts-node -P config/tsconfig.base.json scripts/fixtures/generate-email-fixtures.ts --ontology=procurement --count=100

# Generate financial emails
npx ts-node -P config/tsconfig.base.json scripts/fixtures/generate-email-fixtures.ts --ontology=financial --count=50

# Generate CRM emails
npx ts-node -P config/tsconfig.base.json scripts/fixtures/generate-email-fixtures.ts --ontology=crm --count=25

# Generate FIBO emails
npx ts-node -P config/tsconfig.base.json scripts/fixtures/generate-email-fixtures.ts --ontology=fibo --count=30
```

### Available Ontologies
- **procurement**: Contract awards, RFQs, purchase orders, supplier evaluations, tender notifications
- **financial**: Deal announcements, investment updates, fund raising, merger notifications, IPO announcements
- **crm**: Lead qualification, opportunity updates, customer onboarding, account reviews, sales pitches
- **legal**: Contract reviews, legal consultations, compliance alerts, litigation updates, regulatory notices
- **healthcare**: Patient referrals, medical supply orders, clinical trial updates, regulatory approvals, insurance claims
- **fibo**: Financial instrument trades, risk assessments, compliance reports, market data updates, regulatory filings

### Example Generated Email

```
From: "Lisa Anderson" <lisa.anderson@company.com>
To: "David Brown" <david.brown@vertexconstruction.com>
Subject: RFQ Request for Transport Services from Vertex Construction - Ref: PROCUREMENT-205911

Dear David Brown,

I hope this message finds you well. We are currently in need of transport services and would like to request a quotation from Vertex Construction. The estimated amount for this service is 40263.45 EUR. Please provide a Professional Suitability Summary along with the Concession Estimate for this Concession Contract. Your prompt response is highly appreciated.

Thank you for your attention to this request.

Best regards,
Lisa Anderson
Contract Manager
```

### Processing Email Fixtures

```bash
# Process all email fixtures
npm run pipeline:email

# Process specific email folders
npm run pipeline:email -- --folder=procurement/emails
npm run pipeline:email -- --folder=financial/emails
npm run pipeline:email -- --folder=crm/emails

# Process with database reset
npm run pipeline:email -- --folder=procurement/emails --reset-db
```

### Fake People Data

The system includes comprehensive fake people data for each ontology:

**Procurement Professionals:**
- Sarah Mitchell (Procurement Manager)
- Michael Chen (Senior Buyer)
- Jennifer Rodriguez (Procurement Specialist)
- David Thompson (Strategic Sourcing Manager)
- Lisa Anderson (Contract Manager)
- Robert Williams (Procurement Director)
- Amanda Garcia (Supplier Relations Manager)
- James Johnson (Category Manager)

**Financial Professionals:**
- Alexandra Smith (Investment Manager)
- Christopher Brown (Portfolio Manager)
- Victoria Davis (Financial Analyst)
- Daniel Wilson (Deal Manager)
- Rachel Taylor (Investment Director)
- Kevin Martinez (Fund Manager)
- Nicole Garcia (Financial Controller)
- Thomas Lee (Investment Analyst)

Plus similar professional data for CRM, Legal, Healthcare, and FIBO domains.

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

#### Chat System Returns "No Results"
```bash
# Check if correct database is configured
grep NEO4J_DATABASE .env

# Verify data exists in target database
docker exec -it neo4j-container cypher-shell -u neo4j -p password -d fibo
# Run: MATCH (n) RETURN count(n) as total

# Test chat endpoint directly
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "show all organizations"}'
```

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

The system includes a powerful NLP microservice for advanced entity extraction and knowledge graph generation. The service now supports **ontology scoping** to improve accuracy and reduce noise.

**New Features:**
- **Ontology Scoping**: Specify which ontology to use for extraction (financial, procurement, CRM, etc.)
- **Multiple Ontology Support**: Handle different domains with specialized extraction
- **Production-Ready Deployment**: Docker containers with Nginx reverse proxy
- **Python Client SDK**: Easy integration for external applications

**Quick Start:**
```bash
# Deploy with deployment script (recommended)
chmod +x scripts/deploy-nlp-service.sh
./scripts/deploy-nlp-service.sh

# Deploy with specific ontology support
OPENAI_API_KEY=your_key ./scripts/deploy-nlp-service.sh

# Deploy production version with SSL
./scripts/deploy-nlp-service.sh production

# Manual deployment
cd python-services/nlp-service
docker build -t nlp-service .
docker run -d -p 8000:8000 -e OPENAI_API_KEY=your_key nlp-service
```

**API Usage with Ontology Scoping:**
```bash
# Extract with financial ontology
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    "ontology_name": "financial"
  }'

# Extract with procurement ontology
curl -X POST http://localhost:8000/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Contract awarded to Microsoft Corp. for $50 million.",
    "ontology_name": "procurement"
  }'

# Get available ontologies
curl -X GET http://localhost:8000/ontologies
```

**Python Client SDK:**
```python
from client import NLPServiceClient

client = NLPServiceClient("http://localhost:8000")

# Extract with specific ontology
financial_graph = client.extract_graph(
    "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
    ontology_name="financial"
)

procurement_graph = client.extract_graph(
    "Contract awarded to Microsoft Corp. for $50 million.",
    ontology_name="procurement"
)

# Get available ontologies
ontologies = client.get_available_ontologies()
print(f"Available: {ontologies['available_ontologies']}")
```

**Available Ontologies:**
- `financial` - Financial instruments, companies, investments
- `procurement` - Contracts, tenders, suppliers  
- `crm` - Customers, leads, opportunities
- `default` - General purpose (fallback)

**Benefits of Ontology Scoping:**
- **Improved Accuracy**: Focus on domain-specific patterns
- **Reduced Noise**: Fewer irrelevant entities extracted
- **Better Performance**: Smaller scope for faster processing
- **Domain-Specific Results**: Tailored to specific business domains

**Restart NLP service:**
```bash
cd python-services/nlp-service
python main.py &
```

**Note: System works without NLP services (optional)**

**For detailed NLP service documentation, see:**
- **[NLP Service Ontology Scoping](features/nlp-service-ontology-scoping.md)** - Complete guide to ontology scoping features
- **[API Documentation](../python-services/nlp-service/API_DOCUMENTATION.md)** - Full API reference
- **[Quick Start Guide](../python-services/nlp-service/QUICK_START.md)** - Deployment and usage guide

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
- **Added NLP Service Ontology Scoping** - Support for multiple ontologies (financial, procurement, CRM) to improve extraction accuracy
- **Enhanced NLP Service Deployment** - Production-ready Docker containers with Nginx reverse proxy and SSL support
- **Python Client SDK** - Easy integration for external applications with ontology scoping support
- **Improved Entity Extraction** - Domain-specific extraction with reduced noise and better performance
- **Comprehensive Documentation** - Updated guides and API documentation for NLP service features
- **Fixed chat system database selection** - ChatService now correctly uses configured database instead of default
- **Resolved dependency injection issues** - Added proper @injectable decorators to ChatService and QueryTranslator
- **Fixed QueryTranslator validation bug** - Corrected entity type validation logic that was causing false positives
- **Enhanced multi-database support** - System now properly switches between Neo4j databases (fibo, procurement, crm)
- **Improved chat troubleshooting** - Added comprehensive debugging tools and documentation
- **Enhanced ontology generation** with importance-based filtering and LLM-powered analysis
- **Added FIBO ontology support** with comprehensive processing from EDM Council repository
- **Implemented ignored items tracking** for transparency in ontology filtering
- **Extended ontology interfaces** to support ignored entities and relationships throughout pipeline
- **Added fallback heuristics** when LLM endpoints unavailable for ontology analysis
- **Processed FIBO with 100 entity/relationship limits** for comprehensive financial domain coverage
- **Enhanced documentation** with detailed ontology processing guides and troubleshooting
- **Improved test coverage** with comprehensive mock objects and TDD approach
- **Updated build configuration** for better TypeScript support and error handling 