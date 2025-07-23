# Dashboard Killer Graph

A conversational knowledge platform that uses a graph database and LLMs to replace traditional dashboards. This platform is ontology-agnostic and supports multiple data sources and formats.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Neo4j Desktop or Docker
- OpenAI API key (optional, for LLM features)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd dashboard-killer-graph

# Install dependencies
npm install

# Setup NLP service
npm run setup:nlp

# Generate ontology code
npm run ontologies:generate
```

### Start Development
```bash
# Start Neo4j database
npm run neo4j:start

# Start development server
npm run dev

# In another terminal, start NLP service
npm run dev:nlp
```

### Launch Chat System
```bash
# Launch with default configuration
npm run chat:launch

# Launch with specific ontology
npm run chat:launch procurement
npm run chat:launch fibo
npm run chat:launch geonames
```

## 📚 Documentation

### **Core Documentation**
- [Architecture Overview](docs/architecture/) - System architecture and design patterns
- [Development Guide](docs/development/) - Development setup and workflows
- [Features Guide](docs/features/) - Platform features and capabilities
- [API Reference](docs/features/nlp-service/api-reference.md) - NLP service API documentation

### **Configuration & Scripts**
- [Package Scripts](PACKAGE_SCRIPTS.md) - Complete npm scripts documentation
- [Jest Configuration](JEST_CONFIGURATION.md) - Testing setup and configuration
- [Scripts Organization](scripts/README.md) - Unified scripts documentation

### **Ontology Management**
- [Ontology Guide](docs/development/ontology-development-guide.md) - Creating and managing ontologies
- [Email Ingestion](docs/architecture/email-ingestion-ontology.md) - Email processing pipeline
- [Entity Extraction](docs/architecture/entity-extraction-guide.md) - Entity recognition and extraction

## 🏗️ Project Structure

```
dashboard-killer-graph/
├── src/                          # Main source code
│   ├── platform/                 # Core platform services
│   ├── ingestion/                # Data ingestion pipeline
│   ├── mcp/                      # Model Context Protocol
│   └── shared/                   # Shared utilities
├── ontologies/                   # Ontology plugins
│   ├── procurement/              # Procurement ontology
│   ├── fibo/                     # Financial ontology
│   ├── geonames/                 # Geographic ontology
│   └── ...                       # Other ontologies
├── scripts/                      # Unified scripts
│   ├── database/                 # Database management
│   ├── ontology/                 # Ontology processing
│   ├── launch.sh                 # Unified launcher
│   ├── deploy.sh                 # Unified deployment
│   ├── test.sh                   # Unified testing
│   └── ontologies.sh             # Ontology management
├── python-services/              # Python microservices
│   └── nlp-service/              # NLP processing service
├── chat-ui/                      # React chat interface
├── test/                         # Test files
│   ├── e2e/                      # End-to-end tests
│   ├── fixtures/                 # Test fixtures
│   └── setup.ts                  # Test setup
└── docs/                         # Documentation
```

## 🧪 Testing

### Test Configuration
The project uses a refactored Jest configuration with three main test types:

- **Unit Tests**: Fast, isolated tests with mocked dependencies
- **E2E Tests**: Integration tests with real external services
- **All Tests**: Combined test suite for comprehensive coverage

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run e2e tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Organization
- **Unit Tests**: Located in `src/**/__tests__/` directories
- **E2E Tests**: Located in `test/e2e/` directory
- **Test Fixtures**: Organized by ontology in `ontologies/*/fixtures/`

## 🔧 Development

### Available Scripts

#### **Development**
```bash
npm run dev              # Start development server
npm run dev:nlp          # Start NLP service
npm run dev:all          # Start all services
npm run dev:mcp          # Start MCP server
npm run dev:mcp:http     # Start MCP HTTP server
```

#### **Testing**
```bash
npm test                 # Run all tests
npm run test:unit        # Run unit tests
npm run test:e2e         # Run e2e tests
npm run test:coverage    # Run with coverage
npm run test:watch       # Run in watch mode
npm run test:ci          # Run in CI mode
```

#### **Code Quality**
```bash
npm run type-check       # TypeScript checking
npm run lint             # ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Prettier formatting
npm run format:check     # Check formatting
npm run validate         # Full validation
```

#### **Docker & Database**
```bash
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run neo4j:start      # Start Neo4j
npm run neo4j:stop       # Stop Neo4j
npm run neo4j:logs       # View Neo4j logs
```

#### **Chat System**
```bash
npm run chat:launch      # Launch chat system
npm run chat:list        # List ontologies
npm run chat:ui          # Start UI only
npm run chat:backend     # Start backend only
npm run chat:all         # Start all components
```

#### **Maintenance**
```bash
npm run ontologies:generate  # Generate ontology code
npm run setup:nlp            # Setup NLP environment
npm run security:audit       # Security audit
npm run deps:update          # Update dependencies
npm run deps:check           # Check dependencies
```

### Unified Scripts
The project uses unified scripts for common operations:

```bash
# Database management
npx ts-node scripts/database/manage.ts --help

# Ontology management
./scripts/ontologies.sh --help

# Testing
./scripts/test.sh --help

# Deployment
./scripts/deploy.sh --help
```

## 🗄️ Database Management

### Neo4j Setup
The platform uses Neo4j as the primary graph database. You can run it using:

```bash
# Using Docker (recommended)
npm run neo4j:start

# Using Neo4j Desktop
# 1. Open Neo4j Desktop
# 2. Create a new database
# 3. Set password to "dashboard-killer"
# 4. Start the database
```

### Database Operations
```bash
# List databases
npx ts-node scripts/database/manage.ts list

# Create database
npx ts-node scripts/database/manage.ts create procurement_db

# Reset database
npx ts-node scripts/database/manage.ts reset procurement_db

# Query database
npx ts-node scripts/database/manage.ts query procurement_db "MATCH (n) RETURN count(n)"
```

## 🏛️ Ontology System

### Available Ontologies
- **procurement**: Public procurement data
- **fibo**: Financial industry business ontology
- **geonames**: Geographic names and locations
- **isco**: International Standard Classification of Occupations
- **sp500**: S&P 500 companies and relationships
- **testont**: Test ontology for development

### Ontology Management
```bash
# List all ontologies
./scripts/ontologies.sh list

# Show ontology details
./scripts/ontologies.sh info procurement

# Validate ontology
./scripts/ontologies.sh validate fibo

# Show ontology status
./scripts/ontologies.sh status
```

### Creating New Ontologies
1. Create a new directory in `ontologies/`
2. Add `config.json` with ontology configuration
3. Add `ontology.json` with entity and relationship definitions
4. Create plugin file (optional)
5. Register in the system

## 🔄 Data Ingestion

### Email Ingestion
The platform supports email ingestion with entity extraction:

```bash
# Ingest emails for specific ontology
npx ts-node scripts/database/manage.ts ingest-emails procurement --folder /path/to/emails

# Bulk ingestion with LLM processing
npx ts-node scripts/database/manage.ts ingest-emails procurement --scope procurement --limit 100
```

### Dataset Ingestion
```bash
# Ingest dataset directly
npx ts-node scripts/database/manage.ts ingest-dataset procurement --file /path/to/data.json
```

## 🤖 MCP Integration

The platform supports Model Context Protocol (MCP) for AI agent integration:

### MCP Server
```bash
# Start MCP server (stdio mode)
npm run dev:mcp

# Start MCP server (HTTP mode)
npm run dev:mcp:http

# Test MCP transport
npm run mcp:test
```

### External Agent Server
```bash
# Start external agent server
./scripts/start-external-agent-server.sh
```

## 🚀 Deployment

### Development Deployment
```bash
# Deploy NLP service
./scripts/deploy.sh nlp

# Deploy MCP server
./scripts/deploy.sh mcp 3002

# Deploy all services
./scripts/deploy.sh all
```

### Production Deployment
```bash
# Using Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

## 🔍 Troubleshooting

### Common Issues

#### **Neo4j Connection Issues**
```bash
# Check if Neo4j is running
curl http://localhost:7474

# Start Neo4j if not running
npm run neo4j:start

# Check Neo4j logs
npm run neo4j:logs
```

#### **NLP Service Issues**
```bash
# Check NLP service status
curl http://localhost:8000/health

# Restart NLP service
npm run dev:nlp
```

#### **Test Failures**
```bash
# Run tests with verbose output
npm run test:unit -- --verbose

# Run specific test file
npm run test:unit -- src/platform/chat/__tests__/chat.service.test.ts
```

### Logs and Debugging
```bash
# View application logs
npm run docker:logs

# View Neo4j logs
npm run neo4j:logs

# Enable debug logging
LOG_LEVEL=DEBUG npm run dev
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Quality
```bash
# Run full validation
npm run validate

# Check code formatting
npm run format:check

# Fix formatting issues
npm run format
```

### Testing Guidelines
- Write unit tests for new functionality
- Add integration tests for complex workflows
- Ensure test coverage meets thresholds
- Use descriptive test names and organization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Review [troubleshooting guide](#troubleshooting)
- Open an issue on GitHub
- Contact the development team

---

**Dashboard Killer Graph** - Transforming data into conversational insights through ontology-driven knowledge graphs. 