# Knowledge Graph Dashboard

A comprehensive knowledge graph platform for processing and analyzing business communications, documents, and data.

## Overview

The Knowledge Graph Dashboard ingests, processes, and analyzes data from various sources to build a rich knowledge graph. Supports email processing, document analysis, entity extraction, and ontology-driven reasoning.

## Architecture

### Core Platform

```
src/platform/
├── processing/           # Centralized processing services
├── ontology/            # Ontology management
├── reasoning/           # Ontology-driven reasoning
├── chat/               # Chat interface
├── database/           # Database connections
├── enrichment/         # Data enrichment services
└── security/           # Security and authentication
```

### Domain Ontologies

```
src/ontologies/
├── crm/                # Customer Relationship Management
├── financial/          # Financial domain
├── procurement/        # Procurement domain
└── security/           # Security domain
```

### Ingestion Pipeline

```
src/ingestion/
├── sources/            # Data sources (email, documents, APIs)
├── core/               # Core ingestion logic
└── intelligence/       # AI and NLP services
```

## Key Features

### 1. Email Processing
- **Email Parsing**: Extract structured data from .eml files
- **Attachment Processing**: Support for PDF, Word, Excel, PowerPoint, images
- **Entity Extraction**: Identify entities in content and attachments
- **Relationship Mapping**: Connect entities through communication events

### 2. Ontology-Driven Reasoning
- **Dynamic Reasoning**: Execute algorithms defined in ontologies
- **Multi-Domain Support**: Financial, CRM, and procurement reasoning
- **API Integration**: RESTful endpoints for reasoning execution

### 3. Knowledge Graph Management
- **Neo4j Integration**: Graph database for relationship storage
- **Vector Search**: Similarity search capabilities
- **Data Enrichment**: External data integration

### 4. Chat Interface
- **Natural Language Queries**: Conversational interface
- **Context Awareness**: Maintain conversation context

## Quick Start

### Prerequisites
- Node.js 18+
- Neo4j Database
- Python 3.8+ (for NLP services)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd dashboard-killer-graph-new
npm install

# Configure environment
cp config/environment.example.js config/environment.js
# Edit config/environment.js

# Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# Start application
npm run dev
```

### Quick Start Commands

```bash
# Initialize database
npm run db:init

# Process test emails
npm run demo:email-ingestion

# Test reasoning
npm run demo:reasoning

# Start chat interface
npm run chat:dev
```

## Development

### Project Structure

```
├── src/                    # Source code
│   ├── platform/           # Core platform services
│   ├── ontologies/         # Domain ontologies
│   ├── ingestion/          # Data ingestion
│   ├── shared/             # Shared utilities
│   └── types/              # TypeScript types
├── scripts/                # Utility scripts
├── test-emails/            # Test data
├── docs/                   # Documentation
└── config/                 # Configuration files
```

### Testing

```bash
# Run all tests
npm test

# Run specific tests
npm test -- --testPathPattern=email
npm test -- --testPathPattern=reasoning

# Run with coverage
npm run test:coverage
```

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code quality
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commits

## API Reference

### Email Processing

```typescript
POST /api/email/process
{
  "filePath": "/path/to/email.eml"
}

// Response
{
  "success": true,
  "email": { /* parsed email data */ },
  "entities": [ /* extracted entities */ ],
  "attachmentProcessing": { /* attachment results */ }
}
```

### Reasoning

```typescript
POST /api/reasoning/execute
{
  "ontology": "financial",
  "algorithm": "identify_investment_opportunities"
}
```

### Chat Interface

```typescript
POST /api/chat/message
{
  "message": "Show me all investment opportunities",
  "context": { /* conversation context */ }
}
```

## Configuration

### Environment Variables

```bash
# Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Services
NLP_SERVICE_URL=http://localhost:8000
ANALYSIS_SERVICE_URL=http://localhost:8001

# Logging
LOG_LEVEL=info
```

### Ontology Configuration

```json
{
  "name": "financial",
  "entities": [
    {
      "name": "Company",
      "properties": ["name", "ticker", "industry"],
      "relationships": ["INVESTS_IN", "COMPETES_WITH"]
    }
  ],
  "reasoning": {
    "algorithms": [
      {
        "name": "identify_investment_opportunities",
        "cypher": "MATCH (c:Company) WHERE c.valuation < c.peers RETURN c"
      }
    ]
  }
}
```

## Deployment

### Docker Deployment

```bash
# Build and run
docker build -t knowledge-graph-dashboard .
docker-compose up -d
```

### Production Considerations
- **Database**: Use Neo4j Enterprise
- **Caching**: Implement Redis
- **Monitoring**: Add application monitoring
- **Security**: Configure authentication
- **Backup**: Set up database backups

## Contributing

### Development Workflow

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Write Tests First**: Follow TDD principles
3. **Implement Feature**: Write production code
4. **Run Tests**: Ensure all tests pass
5. **Update Documentation**: Keep docs current
6. **Submit Pull Request**: Include tests and documentation

### Code Standards
- **TypeScript**: Use strict typing
- **Testing**: 100% test coverage for new features
- **Documentation**: Update relevant docs
- **Commits**: Use conventional commit format

## Troubleshooting

### Common Issues

1. **Neo4j Connection**: Check database is running
2. **Python Services**: Ensure NLP services are running
3. **File Permissions**: Check file access for email processing
4. **Memory Issues**: Monitor memory usage for large files

### Debug Mode

```bash
LOG_LEVEL=debug npm run dev
```

## Roadmap

### Planned Features
- **Advanced NLP**: Better entity extraction
- **Real-time Processing**: Stream processing
- **Advanced Reasoning**: More sophisticated algorithms
- **Visualization**: Interactive graph visualization
- **Mobile Support**: Mobile-optimized interface

## Support

- **Documentation**: Check this documentation first
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Contributing**: See CONTRIBUTING.md for guidelines 