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