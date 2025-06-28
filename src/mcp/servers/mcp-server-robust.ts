#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '@shared/utils/logger';

// Variables pour les services optionnels
let queryTranslator: any = null;
let isAdvancedMode = false;

// Initialisation robuste des dépendances
async function initializeDependencies() {
  try {
    logger.error('🔄 Initializing dependencies...');
    
    // Charger reflect-metadata d'abord
    await import('reflect-metadata');
    
    // Essayer de charger les dépendances avec require (pour les modules compilés)
    try {
      const tsyringe = require('tsyringe');
      const QueryTranslatorModule = require('./platform/chat/application/services/query-translator.service');
      
      queryTranslator = tsyringe.container.resolve(QueryTranslatorModule.QueryTranslator);
      isAdvancedMode = true;
      logger.error('✅ Advanced mode enabled');
      return;
    } catch (requireError) {
      // Si require échoue, essayer avec import dynamique
      const { container } = await import('tsyringe');
      
      // Essayer plusieurs chemins possibles
      const possiblePaths = [
        './platform/chat/application/services/query-translator.service',
        '../platform/chat/application/services/query-translator.service',
        './src/platform/chat/application/services/query-translator.service'
      ];
      
      for (const path of possiblePaths) {
        try {
          const { QueryTranslator } = await import(path);
          queryTranslator = container.resolve(QueryTranslator);
          isAdvancedMode = true;
          logger.error('✅ Advanced mode enabled');
          return;
        } catch (pathError) {
          continue;
        }
      }
      
      throw new Error('Could not load QueryTranslator from any path');
    }
    
  } catch (error) {
    logger.error(`⚠️ Advanced features not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger.error('🔄 Running in basic mode');
    isAdvancedMode = false;
  }
}

// Créer le serveur MCP
const mcpServer = new Server(
  {
    name: 'llm-orchestrator-robust',
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
        enum: ['queries', 'data-types', 'examples', 'syntax', 'status'],
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

    if (isAdvancedMode && queryTranslator) {
      try {
        // Mode avancé avec QueryTranslator
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

        logger.error(`✅ Advanced response sent for query: "${query}"`);
        return {
          content: [{ type: 'text', text: response }],
        };
      } catch (error) {
        logger.error('💥 Error in advanced mode:', error);
        // Fallback au mode de base
      }
    }

    // Mode de base (fallback)
    const basicResponse = `🔍 Basic Query Processing:

**Query:** "${query}"

**Status:** ${isAdvancedMode ? 'Advanced mode failed, using basic mode' : 'Running in basic mode'}

**Analysis:**
- The query appears to be asking about: ${query.toLowerCase().includes('contact') ? 'contacts' : 
                                        query.toLowerCase().includes('deal') ? 'deals' :
                                        query.toLowerCase().includes('communication') ? 'communications' :
                                        query.toLowerCase().includes('organization') ? 'organizations' : 'business data'}

**Recommendation:** 
${isAdvancedMode ? 'Try rephrasing your query or check server logs for details.' : 'Advanced query translation is currently unavailable. The server is running in basic mode.'}

**Available Data Types:**
- Contacts and People
- Organizations and Companies  
- Communications and Messages
- Financial Deals and Investments
- Business Relationships`;

    logger.error(`📝 Basic response sent for query: "${query}"`);
    return {
      content: [{ type: 'text', text: basicResponse }],
    };
  }

  if (name === 'help') {
    const topic = args?.topic as string;
    
    let helpContent = `# 🚀 LLM Orchestrator MCP Server Help

## Server Status
- **Mode:** ${isAdvancedMode ? '🟢 Advanced (Full Features)' : '🟡 Basic (Limited Features)'}
- **Query Translation:** ${isAdvancedMode ? 'Available' : 'Unavailable'}
- **Version:** 1.0.0 (Robust)

## Overview
This MCP server provides intelligent access to your business data through natural language queries.

## 🔧 Available Tools

### 1. \`query\` - Intelligent Data Query
${isAdvancedMode ? 
'Translate natural language questions into structured database queries.' :
'Basic query processing with limited translation capabilities.'}

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
\`\`\`

### 2. \`help\` - Get Help and Documentation
Get detailed information about server capabilities and status.

## 🎯 Query Syntax
The server understands natural language in **French** and **English**.

**Supported Commands:**
- **Show/List/Find**: Retrieve data
- **Search**: Find specific items
- **Filter**: Apply conditions
- **Analyze**: Get insights

## 🌐 Data Domains
- **CRM**: Customer relationship management
- **Financial**: Investment and deal tracking
- **Communication**: Message and email history
- **Analytics**: Business intelligence and insights`;

    if (topic === 'status') {
      helpContent = `# 📊 Server Status Report

## Current Configuration
- **Server Mode:** ${isAdvancedMode ? 'Advanced' : 'Basic'}
- **Query Translation:** ${isAdvancedMode ? '✅ Available' : '❌ Unavailable'}
- **Dependencies:** ${isAdvancedMode ? '✅ Loaded' : '⚠️ Limited'}

## Features Available
${isAdvancedMode ? `
✅ Natural language query translation
✅ Structured query generation  
✅ Multi-language support (FR/EN)
✅ Advanced business data analysis
✅ Ontology-based schema validation
` : `
⚠️ Basic query processing only
⚠️ Limited translation capabilities
✅ Help and documentation
✅ Error handling and fallbacks
`}

## Troubleshooting
${isAdvancedMode ? 
'All systems operational. If you experience issues, try rephrasing your queries.' :
'Running in basic mode due to dependency issues. Check server logs for details.'}`;
    }

    return {
      content: [{ type: 'text', text: helpContent }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Démarrer le serveur avec stdio transport
async function main() {
  // Initialiser les dépendances de manière robuste
  await initializeDependencies();
  
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
  logger.error(`🚀 Robust MCP Server running on stdio (${isAdvancedMode ? 'Advanced' : 'Basic'} mode)`);
}

main().catch((error) => {
  logger.error('Fatal error in main():', error);
  process.exit(1);
}); 