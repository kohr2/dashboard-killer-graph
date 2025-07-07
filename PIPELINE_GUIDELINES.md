# Knowledge Graph Pipeline Guidelines

This document describes the end-to-end data processing pipeline that transforms business data into a knowledge graph using ontology-driven intelligence.

## Overview

The pipeline processes various data sources (emails, documents) and transforms them into labeled nodes and relationships in Neo4j using AI-powered entity extraction and ontology mapping.

## Architecture Principles

- **Scripts contain minimal logic** - Only orchestration, no business logic
- **Services contain core logic** - All processing happens in platform services
- **Ontology-driven** - All processing is guided by domain ontologies
- **Modular design** - Each component has a specific responsibility

## Key Components

### 1. Ontology System
**Location**: `src/platform/ontology/`
- Load and validate ontology plugins
- Normalize entity and relationship schemas
- Provide ontology query helpers

### 2. Content Processing
**Location**: `src/platform/processing/`
- Extract entities and relationships from text
- Interface with Python NLP services
- Handle enrichment and embeddings

### 3. Knowledge Graph Storage
**Location**: `src/platform/database/`
- Store entities and relationships in Neo4j
- Create vector indexes for similarity search
- Manage graph schema and constraints

### 4. Email Processing
**Location**: `src/platform/processing/`
- Parse .eml files and extract content
- Process attachments and metadata
- Apply entity extraction pipeline

## Data Flow

```
Input Data → Content Processing → Entity Extraction → Enrichment → Knowledge Graph
     ↓              ↓                    ↓              ↓           ↓
  Email Files → Parse Content → NLP Analysis → AI Enhancement → Neo4j Storage
```

## Pipeline Stages

### Stage 1: Input Processing
- **Email Files**: Parse .eml format with attachments
- **Content Extraction**: Extract text from various formats
- **Metadata Handling**: Process sender, recipient, timestamps

### Stage 2: Entity Extraction
- **NLP Analysis**: Python FastAPI service with spaCy
- **AI Enhancement**: OpenAI GPT-4 for entity refinement
- **Ontology Mapping**: Map entities to domain ontologies

### Stage 3: Graph Construction
- **Entity Creation**: Create nodes with properties
- **Relationship Building**: Connect entities based on ontology
- **Vector Indexing**: Generate embeddings for similarity search

### Stage 4: Storage & Indexing
- **Neo4j Storage**: Persist in graph database
- **Schema Management**: Create constraints and indexes
- **Vector Search**: Enable similarity-based queries

## Configuration

### Environment Variables
```bash
# Required
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# Optional
OPENAI_API_KEY=your-api-key
ENABLE_PROMPT_DEBUG=1
PROMPT_DEBUG_DIR=/tmp/llm-prompts
```

### Ontology Configuration
**Location**: `ontologies/*/config.json`
- Define data sources and extraction rules
- Configure entity and relationship mappings
- Set processing parameters

## Common Commands

### Pipeline Execution
```bash
# Process all email fixtures
npm run pipeline:email

# Process specific ontology
npm run pipeline:email -- --folder=procurement/emails

# Generate email fixtures
npx ts-node scripts/fixtures/generate-email-fixtures.ts --ontology=procurement --count=50
```

### Ontology Management
```bash
# Build ontology from source
npx ts-node scripts/ontology/build-ontology.ts --ontology-name procurement

# Generate code from ontologies
npm run ontologies:generate

# Validate ontology configuration
npm run type-check
```

### Database Operations
```bash
# Start Neo4j
npm run graph:start

# Initialize schema
npm run demo:initialize-schema

# Optimize performance
npm run optimize:database
```

## Monitoring & Debugging

### Health Checks
```bash
# API server health
curl http://localhost:3001/api/health

# NLP service health (if running)
curl http://localhost:8000/health

# Neo4j browser
open http://localhost:7474
```

### Debug Mode
```bash
# Enable detailed logging
LOG_LEVEL=debug npm run dev

# Enable prompt debugging
export ENABLE_PROMPT_DEBUG=1
export PROMPT_DEBUG_DIR="$(pwd)/debug-prompts"
```

### Performance Monitoring
```bash
# Check database performance
npm run graph:analyze

# Monitor test performance
npm run test:performance
```

## Troubleshooting

### Common Issues

**Neo4j Connection**
- Ensure Docker container is running: `docker ps | grep neo4j`
- Check logs: `npm run graph:logs`
- Verify credentials in `.env`

**NLP Service**
- Python services are optional
- Check if running: `ps aux | grep python`
- Validate requirements: `pip install -r requirements.txt`

**Ontology Processing**
- Verify ontology config exists: `ls ontologies/*/config.json`
- Check TypeScript compilation: `npm run type-check`
- Validate JSON structure: `cat ontologies/*/ontology.json | jq`

**Entity Extraction**
- Check OpenAI API key configuration
- Verify ontology loading: Look for "Thing" nodes (indicates mapping failure)
- Review entity type mappings in `ContentProcessingService`

### Performance Tips

1. **Batch Processing**: Process multiple documents together
2. **Vector Indexing**: Ensure vector indexes are created for similarity search
3. **Constraint Management**: Create unique constraints for entity IDs
4. **Memory Management**: Monitor memory usage during large imports
5. **Connection Pooling**: Use connection pooling for database operations

## Testing

### Test Categories
- **Unit Tests**: Individual service testing
- **Integration Tests**: End-to-end pipeline testing
- **Performance Tests**: Load and stress testing

### Test Commands
```bash
# Run all tests (after fixing dependencies)
npm install ts-jest @types/jest
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:performance
```

### Test Data
- **Email Fixtures**: Generated test emails in `test/fixtures/`
- **Ontology Fixtures**: Test ontologies in `ontologies/testont/`
- **Mock Data**: Mock services for external dependencies

## Architecture Patterns

### Dependency Injection
- Services are registered with `tsyringe` container
- Dependencies are injected at runtime
- Easy testing with mock implementations

### Domain-Driven Design
- Each ontology represents a business domain
- Clear boundaries between different domains
- Shared kernel for common functionality

### Test-Driven Development
- Tests written before implementation
- Comprehensive coverage of business logic
- Mock external dependencies

## Security Considerations

- **API Keys**: Store in environment variables, not code
- **Database Access**: Use connection pooling and parameterized queries
- **Data Validation**: Validate all inputs before processing
- **Error Handling**: Never expose internal details in error messages

---

**For detailed implementation guides, see the `/docs` directory.** 