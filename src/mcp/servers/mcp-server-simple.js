#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Traduction basique des requêtes sans dépendances
function translateQueryBasic(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const lowercaseQuery = query.toLowerCase();
  
  // Détection des types d'entités
  const entityTypes = [];
  
  if (lowercaseQuery.includes('deal') || lowercaseQuery.includes('transaction')) {
    entityTypes.push('Deal');
  }
  if (lowercaseQuery.includes('contact') || lowercaseQuery.includes('person') || lowercaseQuery.includes('people')) {
    entityTypes.push('Contact', 'Person');
  }
  if (lowercaseQuery.includes('organization') || lowercaseQuery.includes('company') || lowercaseQuery.includes('companies') || lowercaseQuery.includes('firm')) {
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
  const filters = {};
  
  // Extraire les noms propres
  const words = query.split(/\s+/);
  const commonWords = ['Show', 'Find', 'Get', 'List', 'Display', 'Search'];
  const properNouns = words.filter(word => 
    /^[A-Z][a-z]+/.test(word) && !commonWords.includes(word)
  );
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

// Serveur MCP sans logs pour éviter l'interférence JSON
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

// Définir l'outil query
const queryTool = {
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
const helpTool = {
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
  return {
    tools: [queryTool, helpTool],
  };
});

// Gestionnaire pour appeler les outils
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'query') {
    const query = args?.query;
    if (typeof query !== 'string') {
      throw new Error("The 'query' parameter must be a string");
    }

    try {
      const structuredQuery = translateQueryBasic(query);
      
      const response = `🔍 Query Translation Result (Simple Mode):

**Original Query:** "${query}"

**Structured Query:**
\`\`\`json
${JSON.stringify(structuredQuery, null, 2)}
\`\`\`

**Analysis:**
- Command: ${structuredQuery.command}
- Resource Types: ${structuredQuery.resourceTypes?.join(', ') || 'N/A'}
- Filters: ${structuredQuery.filters ? JSON.stringify(structuredQuery.filters) : 'None'}

**Note:** This is a simplified JavaScript translation without external dependencies.`;

      return {
        content: [{ type: 'text', text: response }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ Error processing query: ${error.message}` }],
      };
    }
  }

  if (name === 'help') {
    const topic = args?.topic;
    
    let helpContent = `# 🛠️ MCP Server Help (Simple Mode)

## Server Status
- **Mode:** 🟢 Simple JavaScript (No Dependencies)
- **Query Translation:** Basic pattern matching
- **Logs:** Completely disabled

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
This server runs pure JavaScript with no external dependencies for maximum stability.`;

    if (topic === 'status') {
      helpContent = `# 📊 Server Status Report (Simple Mode)

## Current Configuration
- **Server Mode:** Simple JavaScript
- **Query Translation:** ✅ Basic Pattern Matching
- **Dependencies:** ✅ None
- **Logs:** ✅ Completely Disabled

## Features Available
✅ Basic query pattern matching
✅ Simple entity detection
✅ Help and documentation
✅ Maximum stability

## Troubleshooting
Server is running in simple mode with no dependencies. Should work reliably with Claude Desktop.`;
    }

    return {
      content: [{ type: 'text', text: helpContent }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Gestionnaire d'arrêt propre (silencieux)
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Démarrer le serveur (silencieux)
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch(() => process.exit(1)); 