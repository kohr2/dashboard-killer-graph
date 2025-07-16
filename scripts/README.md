# Scripts Organization

This directory contains various utility scripts organized by category for better maintainability.

## Directory Structure

### 📺 `demo/`
Scripts for demonstrating system capabilities and testing features:
- `ingest-email.ts` - **Unified email ingestion tool** for ontology-specific and bulk processing
- `test-chat.ts` - Chat interface testing script
- `test-llm-orchestrator.ts` - LLM orchestration testing

### 🗄️ `database/`
Scripts for database operations and Neo4j management:
- `build-neo4j-graph.ts` - Build knowledge graph from extraction reports
- `cleanup-db-labels.ts` - Clean up database labels and constraints
- `initialize-schema.ts` - Initialize database schema
- `optimize-database.ts` - Database optimization and performance tuning
- `reset-neo4j.ts` - Reset Neo4j database
- `run-full-ingestion.ts` - Run complete data ingestion pipeline
- `run-neo4j-ingestion.ts` - Neo4j-specific ingestion operations

### 🧹 `maintenance/`
Scripts for code maintenance, cleanup, and technical debt management:
- `cleanup-configs.ts` - Clean up duplicate and obsolete configuration files
- `cleanup-dead-code.ts` - Remove unused code and dependencies
- `quick-debt-fixes.ts` - Apply quick fixes for technical debt
- `reduce-technical-debt.ts` - Comprehensive technical debt reduction

### 🏛️ `ontology/`
Scripts for ontology management and synchronization:
- `sync-ontology.ts` - Synchronize ontology definitions with code generation
- `templates/` - Handlebars templates for code generation:
  - `entity.hbs` - Template for generating entity interfaces
  - `repository.interface.hbs` - Template for generating repository interfaces

## Usage

All scripts can be run using `ts-node` or `npm run` commands. For example:

```bash
# Run unified email ingestion (ontology mode)
npx ts-node scripts/demo/ingest-email.ts fibo --generate

# Run unified email ingestion (bulk mode)
npx ts-node scripts/demo/ingest-email.ts --folder=procurement/emails --ontology=procurement

# Clean up configurations
npx ts-node scripts/maintenance/cleanup-configs.ts

# Build Neo4j graph
npx ts-node scripts/database/build-neo4j-graph.ts

# Sync ontology
npx ts-node scripts/ontology/sync-ontology.ts
```

## 📧 Unified Email Ingestion Script

The `ingest-email.ts` script is a powerful unified tool that combines ontology-specific and bulk email processing capabilities.

### Features

- **Dual Mode Operation**: Supports both ontology-specific and bulk processing modes
- **Build Options**: Configurable ontology building with entity/relationship limits
- **Flexible Input**: Generate emails, use existing fixtures, or specify custom email files
- **Database Management**: Optional database reset and configuration
- **Rich CLI**: Comprehensive command-line interface with help system

### Usage Examples

#### Ontology-Specific Mode
```bash
# Process single ontology with generated email
npx ts-node scripts/demo/ingest-email.ts fibo --generate

# Process with custom email and build options
npx ts-node scripts/demo/ingest-email.ts procurement --email=./custom-email.eml --top-entities=20

# Process with custom build configuration
npx ts-node scripts/demo/ingest-email.ts fibo --generate --top-entities=50 --include-external
```

#### Bulk Processing Mode
```bash
# Process all emails from ontology folder
npx ts-node scripts/demo/ingest-email.ts --folder=procurement/emails --ontology=procurement

# Process specific file with database reset
npx ts-node scripts/demo/ingest-email.ts --file=email1.eml --folder=financial/emails --reset-db

# Process with limit
npx ts-node scripts/demo/ingest-email.ts --folder=emails --limit=10 --ontology=procurement
```

### CLI Options

| Option | Description | Mode |
|--------|-------------|------|
| `--generate` | Generate new fixture email | Ontology |
| `--email=<path>` | Use specific email file | Ontology |
| `--folder=<path>` | Folder under test/fixtures | Bulk |
| `--file=<filename>` | Specific email file to process | Bulk |
| `--limit=<number>` | Limit number of emails | Bulk |
| `--top-entities=<number>` | Limit top entities for build | Ontology |
| `--top-relationships=<number>` | Limit top relationships for build | Ontology |
| `--include-external` | Include external entities/relationships | Ontology |
| `--ontology=<name>` | Ontology name | Both |
| `--database=<name>` | Neo4j database name | Both |
| `--reset-db` | Clear database before ingesting | Both |
| `--help, -h` | Show help message | Both |

## Configuration

Most scripts use the project's TypeScript configuration (`tsconfig.json`) and can access shared utilities and services through the configured path aliases. 