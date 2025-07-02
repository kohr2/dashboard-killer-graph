# Getting Started Guide

Quick setup guide for the Knowledge Graph Dashboard platform.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Neo4j Desktop (or Docker)
- Git

### Installation

```bash
# Clone and install
git clone <repository-url>
cd dashboard-killer-graph-new
npm install

# Install Python dependencies
cd python-services/nlp-service && pip install -r requirements.txt
cd ../analysis-service && pip install -r requirements.txt
cd ../..

# Configure environment
cp config/environment.example.js config/environment.js
# Edit config/environment.js
```

### Start Services

```bash
# Start all services (in separate terminals)
npm run dev              # Node.js API server (port 3001)
npm run dev:nlp          # Python NLP service (port 8000)
npm run dev:analysis     # Python analysis service (port 8001)
npm run dev:chat         # Chat UI (port 3000)
npm run dev:mcp          # MCP server (port 3002)
```

### Verify Setup

```bash
# Test email processing with attachments
npm run demo:attachment-processing

# Test chat interface
npm run demo:chat

# Test reasoning capabilities
npm run demo:reasoning
```

## Architecture Overview

### Core Components

1. **Core Ontology** (`config/ontology/core.ontology.json`)
   - Domain-agnostic entities like `Communication`, `Thing`, `UnrecognizedEntity`
   - Foundation for all domain extensions

2. **Domain Plugins**
   - **CRM**: Customer relationship management
   - **Financial**: Financial instruments and market data
   - **Procurement**: Supply chain management (disabled by default)

3. **Microservices**
   - **Node.js API**: Main application server (port 3001)
   - **Python NLP**: Entity extraction (port 8000)
   - **Python Analysis**: Content analysis (port 8001)
   - **Chat UI**: React interface (port 3000)
   - **MCP Server**: Claude Desktop integration (port 3002)

### Communication Entity

The `Communication` entity is part of the core ontology, making it reusable across all domains:

```json
{
  "Communication": {
    "parent": "Thing",
    "description": "Generic communication entity for emails, calls, meetings, etc.",
    "properties": {
      "id": "string",
      "type": "string",
      "status": "string", 
      "subject": "string",
      "body": "string",
      "sender": "string",
      "recipients": "array",
      "timestamp": "datetime",
      "metadata": "object"
    },
    "keyProperties": ["id", "type", "sender", "timestamp"],
    "vectorIndex": true
  }
}
```

## Development Workflow

### Test-Driven Development (TDD)

This project follows strict TDD principles:

```bash
# 1. Write failing test first
npm test -- --testNamePattern="should extract entities"

# 2. Implement minimal code to make test pass
# 3. Refactor while keeping tests green
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- src/ontologies/crm/__tests__/plugin-loading.test.ts
npm test -- src/ingestion/__tests__/integration/email-pipeline.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## Email Processing

### Supported File Types

- **PDF** (`.pdf`) - Text extraction
- **Microsoft Word** (`.docx`, `.doc`) - Document parsing
- **Excel** (`.xlsx`, `.xls`) - Spreadsheet data
- **PowerPoint** (`.pptx`, `.ppt`) - Presentation content
- **Images** (`.jpg`, `.png`, `.gif`) - OCR processing
- **Plain Text** (`.txt`) - Direct reading

### Processing Pipeline

```
Email with Attachments
         ↓
   EmailProcessor
         ↓
   AttachmentProcessor (for each attachment)
         ↓
   Text Extraction (PDF/Word/Excel/PowerPoint/Images)
         ↓
   Entity Extraction (NLP Service)
         ↓
   Knowledge Graph Storage
         ↓
   Communication Entity + Extracted Entities
```

### Demo Commands

```bash
# Process test emails
npm run demo:attachment-processing

# Test specific email file
npm run ts-node scripts/demo/test-attachment-processing.ts test-emails/01-helix-sourcing.eml
```

## Chat Interface

### Features

- **Natural Language Queries**: Ask questions in plain English
- **Entity Exploration**: Browse and search entities
- **Relationship Visualization**: See connections between entities
- **Reasoning Capabilities**: AI-powered insights

### Usage

1. Start the chat UI: `npm run dev:chat`
2. Open browser to `http://localhost:3000`
3. Ask questions like:
   - "Show me all contacts from Acme Corp"
   - "What deals are in the pipeline?"
   - "Find communications mentioning financial data"

## MCP Integration (Claude Desktop)

### Setup

1. Start MCP server: `npm run dev:mcp`
2. Configure Claude Desktop with MCP server
3. Use natural language to interact with the knowledge graph

### Configuration

```json
{
  "mcpServers": {
    "dashboard-killer-graph": {
      "command": "node",
      "args": ["src/mcp/servers/mcp-server-simple.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Monitoring and Debugging

### Logs

```bash
# View API server logs
npm run dev

# View specific service logs
LOG_LEVEL=debug npm run dev:nlp

# Debug mode for tests
DEBUG=* npm test
```

### Health Checks

```bash
# Check API server
curl http://localhost:3001/health

# Check NLP service
curl http://localhost:8000/health

# Check analysis service
curl http://localhost:8001/health
```

### Database Queries

```bash
# Connect to Neo4j browser
open http://localhost:7474

# Run test queries
npm run ts-node scripts/demo/test-chat.ts
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :3001
   # Kill process
   kill -9 <PID>
   ```

2. **Neo4j connection failed**
   - Verify Neo4j is running
   - Check credentials in `config/environment.js`
   - Ensure firewall allows port 7687

3. **Python services not starting**
   - Verify Python 3.8+ is installed
   - Check dependencies: `pip list`
   - Reinstall: `pip install -r requirements.txt`

4. **Tests failing**
   - Check test database connection
   - Verify all services are running
   - Run with debug: `DEBUG=* npm test`

### Getting Help

- Check the [troubleshooting guide](troubleshooting.md)
- Review [API documentation](../development/api-reference.md)
- Open an issue with detailed error information

## Next Steps

### Learning Path

1. **Start with demos**: Run the demo scripts to see the system in action
2. **Explore the chat interface**: Try different queries and see how entities are connected
3. **Review the codebase**: Understand the plugin-based architecture
4. **Add a new feature**: Follow TDD approach to extend functionality

### Key Documentation

- [Ontology Architecture](../architecture/ontologies.md) - Understanding the plugin system
- [TDD Approach](../development/tdd-approach.md) - Development methodology
- [Email Processing](../features/email-attachment-processing.md) - Document processing
- [API Reference](../development/api-reference.md) - Technical documentation

### Contributing

- Follow TDD principles: write tests first
- Use conventional commits: `feat: add new feature`
- Add comprehensive documentation
- Ensure all tests pass before submitting

## Success Metrics

You'll know the setup is working when:

- ✅ All services start without errors
- ✅ Email processing demo completes successfully
- ✅ Chat interface responds to queries
- ✅ All tests pass with >80% coverage
- ✅ MCP server connects to Claude Desktop
- ✅ Neo4j contains processed entities and relationships 