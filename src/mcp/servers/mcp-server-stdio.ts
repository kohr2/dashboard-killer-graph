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
import './register-ontologies';

// Créer le serveur MCP
const mcpServer = new Server(
  {
    name: 'llm-orchestrator-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Définir l'outil query
const queryTool: Tool = {
  name: 'query',
  description: 'Performs a query and returns information.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The question to ask',
      },
    },
    required: ['query'],
  },
};

// Gestionnaire pour lister les outils
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 ListTools called');
  return {
    tools: [queryTool],
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
      const queryTranslator = container.resolve(QueryTranslator);
      const structuredQuery = await queryTranslator.translate(query);
      const response = `Translated query: ${JSON.stringify(structuredQuery)}`;
      const result: CallToolResult = {
        content: [{ type: 'text', text: response }],
      };
      console.error(`✅ Response sent:`, result);
      return result;
    } catch (error) {
      console.error('💥 Error during query translation:', error);
      throw new Error('Failed to translate query');
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Démarrer le serveur avec stdio transport
async function main() {
  const transport = new StdioServerTransport();
  
  // Gestionnaire de fermeture propre
  process.on('SIGINT', async () => {
    console.error('🛑 Shutting down gracefully...');
    await mcpServer.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.error('🛑 Shutting down gracefully...');
    await mcpServer.close();
    process.exit(0);
  });
  
  await mcpServer.connect(transport);
  console.error('🚀 MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
}); 