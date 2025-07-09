# MCP Server Architecture

The MCP server provides ontology-agnostic Claude Desktop integration for natural language queries against the knowledge graph.

## Overview

**Location**: `src/mcp/servers/mcp-server-simple.js`  
**Tool**: Single `queryGraph` tool that adapts to active ontologies  
**Protocol**: Model Context Protocol (MCP) for Claude Desktop integration

## Key Features

- **Ontology-Agnostic**: Automatically adapts to enabled ontology plugins
- **Dynamic Descriptions**: Generates contextual help from `ontology.json` files
- **Flexible Configuration**: Runtime ontology and database selection
- **Query Examples**: Auto-generated examples from actual entity types

## Core Components

### 1. Tool Discovery (`ListToolsRequestSchema`)
- Announces available tools to Claude Desktop
- Generates dynamic tool description based on active ontologies
- Includes entity counts and query examples

### 2. Query Execution (`CallToolRequestSchema`) 
- Processes `queryGraph` tool calls
- Auto-adds LIMIT 10 for performance
- Uses existing `ChatService` for query processing

## Configuration

### Environment Variables

```bash
# Configure active ontologies
MCP_ACTIVE_ONTOLOGIES=financial,crm npm run dev:mcp

# Configure database
NEO4J_DATABASE=fibo npm run dev:mcp
```

### Dynamic Tool Description

The server generates descriptions by:
1. Loading entities from `ontologies/*/ontology.json`
2. Filtering relevant entities (with `vectorIndex: true`)
3. Creating query examples like `"show all Organization"`

## Usage Examples

```bash
# Financial analysis
MCP_ACTIVE_ONTOLOGIES=financial NEO4J_DATABASE=fibo npm run dev:mcp

# CRM queries
MCP_ACTIVE_ONTOLOGIES=crm npm run dev:mcp

# Multi-domain
MCP_ACTIVE_ONTOLOGIES=financial,crm,procurement npm run dev:mcp
```

## Claude Desktop Queries

The server adapts examples based on active ontologies:

- **Financial**: `"show all LegalEntity"`, `"show all Organization"`
- **CRM**: `"show all Person"`, `"show all Contact"`
- **FIBO**: `"show all FinancialInstrument"`
- **Procurement**: Examples from 148+ entities

## Troubleshooting

- **Missing entities**: Check `ontology.json` files exist
- **Wrong ontologies**: Verify `MCP_ACTIVE_ONTOLOGIES` variable
- **No response**: Ensure Neo4j is running and accessible