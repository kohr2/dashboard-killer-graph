# Scripts Organization

This directory contains various utility scripts organized by category for better maintainability.

## Directory Structure

### 📺 `demo/`
Scripts for demonstrating system capabilities and testing features:
- `demo-email-ingestion-spacy.ts` - Email ingestion pipeline demonstration with spaCy NLP
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
# Run email ingestion demo
npx ts-node scripts/demo/demo-email-ingestion-spacy.ts

# Clean up configurations
npx ts-node scripts/maintenance/cleanup-configs.ts

# Build Neo4j graph
npx ts-node scripts/database/build-neo4j-graph.ts

# Sync ontology
npx ts-node scripts/ontology/sync-ontology.ts
```

## Configuration

Most scripts use the project's TypeScript configuration (`tsconfig.json`) and can access shared utilities and services through the configured path aliases. 