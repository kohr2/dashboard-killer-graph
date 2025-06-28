#!/usr/bin/env node
import 'reflect-metadata';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { container } from 'tsyringe';
import { QueryTranslator } from './platform/chat/application/services/query-translator.service';
import { logger } from '@shared/utils/logger';

// Créer le serveur MCP
const mcpServer = new Server(
  {
    name: 'llm-orchestrator-simple',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Définir l'outil query avec documentation détaillée
const queryTool: Tool = {
  name: 'query',
  description: `Intelligent query translator and executor for business data. 
  
This tool can understand natural language queries in French or English and translate them into structured queries for:
- CRM data (contacts, communications, organizations)
- Financial data (deals, investments, funds)
- Business relationships and insights

Examples of queries you can ask:
- "Trouve tous les contacts dans le secteur technologique"
- "Show me recent deals with Blackstone"
- "List communications from last week"
- "Find organizations in Paris"
- "What are the latest investment opportunities?"`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language query in French or English about business data (contacts, deals, organizations, communications, etc.)',
        examples: [
          "Trouve tous les contacts dans le secteur technologique",
          "Show me recent deals with Blackstone",
          "List communications from last week",
          "Find organizations in Paris"
        ]
      },
    },
    required: ['query'],
  },
};

// Définir l'outil d'aide
const helpTool: Tool = {
  name: 'help',
  description: `Get comprehensive help about the MCP server capabilities and available data.
  
This tool provides information about:
- Available data types and schemas
- Query syntax and examples
- Business domain coverage
- Integration capabilities`,
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'Specific help topic (optional)',
        enum: ['queries', 'data-types', 'examples', 'syntax'],
      },
    },
    required: [],
  },
};

// Gestionnaire pour lister les outils
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.error('📋 ListTools called');
  return {
    tools: [queryTool, helpTool],
  };
});

// Gestionnaire pour appeler les outils
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  logger.error(`🔧 CallTool called with: ${request.params.name}`);
  const { name, arguments: args } = request.params;

  if (name === 'query') {
    const query = args?.query as string;
    if (typeof query !== 'string') {
      throw new Error("The 'query' parameter must be a string");
    }

    try {
      // Utiliser le QueryTranslator pour traduire la requête
      const queryTranslator = container.resolve(QueryTranslator);
      const structuredQuery = await queryTranslator.translate(query);
      
      const response = `🔍 Query Translation Result:

**Original Query:** "${query}"

**Structured Query:**
\`\`\`json
${JSON.stringify(structuredQuery, null, 2)}
\`\`\`

**Explanation:**
- Command: ${structuredQuery.command}
- Resource Types: ${structuredQuery.resourceTypes?.join(', ') || 'N/A'}
- Filters: ${Object.keys(structuredQuery.filters || {}).length > 0 ? JSON.stringify(structuredQuery.filters) : 'None'}
- Relationship Type: ${structuredQuery.relationshipType || 'None'}

This structured query can be used to search your business data efficiently.`;

      const result: CallToolResult = {
        content: [{ type: 'text', text: response }],
      };
      logger.error(`✅ Response sent for query: "${query}"`);
      return result;
    } catch (error) {
      logger.error('💥 Error during query translation:', error);
      const errorResponse = `❌ Error translating query: "${query}"

Error details: ${error instanceof Error ? error.message : 'Unknown error'}

Please try rephrasing your query or provide more specific information about what you're looking for.`;
      
      return {
        content: [{ type: 'text', text: errorResponse }],
      };
    }
  }

  if (name === 'help') {
    const topic = args?.topic as string;
    
    let helpContent = `# 🚀 LLM Orchestrator MCP Server Help

## Overview
This MCP server provides intelligent access to your business data through natural language queries.

## 🔧 Available Tools

### 1. \`query\` - Intelligent Data Query
Translate natural language questions into structured database queries.

**Supported Data Types:**
- 👥 **Contacts**: People, their information, and relationships
- 🏢 **Organizations**: Companies, institutions, and entities
- 💬 **Communications**: Emails, messages, and interactions
- 💰 **Financial Data**: Deals, investments, funds, and transactions
- 📊 **Business Intelligence**: Insights and analytics

**Query Examples:**
\`\`\`
"Trouve tous les contacts dans le secteur technologique"
"Show me recent deals with Blackstone"
"List communications from last week"
"Find organizations in Paris"
"What are the latest investment opportunities?"
"Qui sont les contacts chez Goldman Sachs?"
"Show me all communications about the Helix deal"
\`\`\`

### 2. \`help\` - Get Help and Documentation
Get detailed information about server capabilities.

## 🎯 Query Syntax
The server understands natural language in **French** and **English**.

**Supported Commands:**
- **Show/List/Find**: Retrieve data
- **Search**: Find specific items
- **Filter**: Apply conditions
- **Analyze**: Get insights

**Supported Filters:**
- Sector/Industry
- Location/Geography
- Time periods
- Company names
- Contact types
- Deal stages

## 🌐 Data Domains
- **CRM**: Customer relationship management
- **Financial**: Investment and deal tracking
- **Communication**: Message and email history
- **Analytics**: Business intelligence and insights`;

    if (topic) {
      switch (topic) {
        case 'queries':
          helpContent = `# 🔍 Query Examples and Patterns

## CRM Queries
- "Trouve tous les contacts chez [Company]"
- "List all communications with [Person]"
- "Show contacts in [Sector/Industry]"
- "Find organizations in [Location]"

## Financial Queries  
- "Show recent deals with [Fund/Company]"
- "List investment opportunities"
- "Find deals in [Sector]"
- "Show fund performance"

## Communication Queries
- "Show emails from last week"
- "Find communications about [Topic]"
- "List messages with [Contact]"

## Time-based Queries
- "Show data from last month"
- "Find recent activities"
- "List historical communications"`;
          break;
        case 'data-types':
          helpContent = `# 📊 Available Data Types

## Contact Data
- Personal information (name, email, phone)
- Professional details (title, company)
- Relationships and connections
- Communication history

## Organization Data
- Company information
- Industry classification
- Location and geography
- Business relationships

## Financial Data
- Deal information and stages
- Investment opportunities
- Fund data and performance
- Transaction history

## Communication Data
- Email messages and threads
- Meeting records
- Call logs
- Document exchanges`;
          break;
        case 'examples':
          helpContent = `# 💡 Practical Query Examples

## French Examples
\`\`\`
"Trouve tous les contacts dans le secteur technologique"
"Montre-moi les deals récents avec Blackstone"
"Liste les communications de la semaine dernière"
"Cherche les organisations à Paris"
"Quelles sont les dernières opportunités d'investissement?"
\`\`\`

## English Examples
\`\`\`
"Show me all contacts at Goldman Sachs"
"Find recent deals in healthcare"
"List communications about the merger"
"Search for funds investing in AI"
"What are the top performing investments?"
\`\`\``;
          break;
        case 'syntax':
          helpContent = `# 📝 Query Syntax Guide

## Natural Language Processing
The server uses AI to understand natural language queries in French and English.

## Query Structure
1. **Action**: What you want to do (find, show, list, search)
2. **Target**: What type of data (contacts, deals, communications)
3. **Filters**: Conditions to apply (company, sector, time)
4. **Context**: Additional information

## Supported Patterns
- "Find [type] with [condition]"
- "Show [type] from [timeframe]"
- "List [type] in [location/sector]"
- "Search for [specific item]"`;
          break;
      }
    }

    return {
      content: [{ type: 'text', text: helpContent }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Démarrer le serveur avec stdio transport
async function main() {
  const transport = new StdioServerTransport();
  
  // Gestionnaire de fermeture propre
  process.on('SIGINT', async () => {
    logger.error('🛑 Shutting down gracefully...');
    await mcpServer.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.error('🛑 Shutting down gracefully...');
    await mcpServer.close();
    process.exit(0);
  });
  
  await mcpServer.connect(transport);
  logger.error('🚀 Simple MCP Server running on stdio');
}

main().catch((error) => {
  logger.error('Fatal error in main():', error);
  process.exit(1);
}); 