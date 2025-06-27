#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Version fallback sans appels OpenAI
const mcpServer = new Server(
  {
    name: 'llm-orchestrator-fallback',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Fonction simple de traduction de requêtes sans IA
function translateQueryBasic(query: string) {
  const lowercaseQuery = query.toLowerCase();
  
  // Détection des types d'entités
  const entityTypes = [];
  if (lowercaseQuery.includes('deal') || lowercaseQuery.includes('transaction')) {
    entityTypes.push('Deal');
  }
  if (lowercaseQuery.includes('contact') || lowercaseQuery.includes('person') || lowercaseQuery.includes('people')) {
    entityTypes.push('Contact', 'Person');
  }
  if (lowercaseQuery.includes('organization') || lowercaseQuery.includes('company') || lowercaseQuery.includes('firm')) {
    entityTypes.push('Organization');
  }
  if (lowercaseQuery.includes('communication') || lowercaseQuery.includes('email') || lowercaseQuery.includes('message')) {
    entityTypes.push('Communication');
  }
  if (lowercaseQuery.includes('investor') || lowercaseQuery.includes('fund')) {
    entityTypes.push('Investor', 'Fund');
  }
  
  // Si aucun type détecté, utiliser Deal par défaut
  if (entityTypes.length === 0) {
    entityTypes.push('Deal');
  }
  
  // Détection des filtres
  const filters: any = {};
  
  // Extraire les noms propres (mots avec majuscule)
  const words = query.split(/\s+/);
  const properNouns = words.filter(word => /^[A-Z][a-z]+/.test(word));
  if (properNouns.length > 0) {
    filters.name = properNouns.join(' ');
  }
  
  // Détection de commandes
  let command = 'show';
  if (lowercaseQuery.includes('related') || lowercaseQuery.includes('with') || lowercaseQuery.includes('lié')) {
    command = 'show_related';
  }
  
  return {
    command,
    resourceTypes: entityTypes,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    relatedTo: command === 'show_related' ? ['Organization'] : undefined
  };
}

// Définir l'outil query
const queryTool: Tool = {
  name: 'query',
  description: `Intelligent query processor for business data. 
  
This tool processes natural language queries about:
- CRM data (contacts, communications, organizations)
- Financial data (deals, investments, funds)
- Business relationships and insights

Examples:
- "Show recent deals with Blackstone"
- "Find contacts in technology sector"
- "List communications from last week"`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language query about business data',
      },
    },
    required: ['query'],
  },
};

// Définir l'outil d'aide
const helpTool: Tool = {
  name: 'help',
  description: 'Get help about server capabilities',
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'Help topic',
        enum: ['queries', 'examples', 'status'],
      },
    },
    required: [],
  },
};

// Gestionnaire pour lister les outils
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 ListTools called');
  return {
    tools: [queryTool, helpTool],
  };
});

// Gestionnaire pour appeler les outils
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`🔧 CallTool called with: ${request.params.name}`);
  const { name, arguments: args } = request.params;

  if (name === 'query') {
    const query = args?.query as string;
    if (typeof query !== 'string') {
      throw new Error("The 'query' parameter must be a string");
    }

    try {
      // Traduction simple sans IA
      const structuredQuery = translateQueryBasic(query);
      
      const response = `🔍 Query Translation Result (Fallback Mode):

**Original Query:** "${query}"

**Structured Query:**
\`\`\`json
${JSON.stringify(structuredQuery, null, 2)}
\`\`\`

**Analysis:**
- Command: ${structuredQuery.command}
- Resource Types: ${structuredQuery.resourceTypes?.join(', ') || 'N/A'}
- Filters: ${structuredQuery.filters ? JSON.stringify(structuredQuery.filters) : 'None'}

**Note:** This is a simplified translation without AI processing. For more accurate results, ensure the advanced mode is working.`;

      console.error(`✅ Fallback response sent for query: "${query}"`);
      return {
        content: [{ type: 'text', text: response }],
      };
    } catch (error) {
      console.error('💥 Error in fallback mode:', error);
      return {
        content: [{ type: 'text', text: `❌ Error processing query: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      };
    }
  }

  if (name === 'help') {
    const topic = args?.topic as string;
    
    let helpContent = `# 🛠️ MCP Server Help (Fallback Mode)

## Server Status
- **Mode:** 🟡 Fallback (Simplified Processing)
- **Query Translation:** Basic pattern matching
- **Dependencies:** Minimal

## Available Tools

### 1. \`query\` - Basic Query Processing
Processes natural language queries using simple pattern matching.

**Examples:**
- "Show recent deals with Blackstone"
- "Find contacts in technology"
- "List communications"

### 2. \`help\` - Documentation
Get help about server capabilities.

## Supported Data Types
- Contacts and People
- Organizations and Companies
- Communications and Messages
- Financial Deals and Investments
- Business Relationships

## Note
This server is running in fallback mode with simplified processing. For advanced AI-powered query translation, the full mode needs to be configured.`;

    if (topic === 'status') {
      helpContent = `# 📊 Server Status Report (Fallback Mode)

## Current Configuration
- **Server Mode:** Fallback
- **Query Translation:** ⚠️ Basic Only
- **Dependencies:** ✅ Minimal

## Features Available
⚠️ Basic query pattern matching
⚠️ Simple entity detection
✅ Help and documentation
✅ Stable operation

## Troubleshooting
Server is running in fallback mode for maximum stability. Advanced features are not available.`;
    }

    return {
      content: [{ type: 'text', text: helpContent }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Gestionnaire d'arrêt propre
process.on('SIGINT', () => {
  console.error('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('🛑 Shutting down gracefully...');
  process.exit(0);
});

// Démarrer le serveur
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('🚀 Fallback MCP Server running on stdio');
}

main().catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
}); 