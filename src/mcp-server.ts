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

// Créer le serveur
const server = new Server(
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
      query: { // Changed from 'question' to 'query' to match client
        type: 'string',
        description: 'The question to ask',
      },
    },
    required: ['query'],
  },
};

// CRITIQUE: Gestionnaire pour lister les outils
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 ListTools called - Returning available tools');
  return {
    tools: [queryTool],
  };
});

// CRITIQUE: Gestionnaire pour appeler les outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`🔧 CallTool called with: ${request.params.name}`);
  console.error(`📤 Arguments:`, request.params.arguments);
  
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
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
      console.error(`✅ Response sent:`, result);
      return result;
    } catch (error) {
      console.error('💥 Error during query translation:', error);
      throw new Error('Failed to translate query');
    }
  }

  console.error(`❌ Unknown tool requested: ${name}`);
  throw new Error(`Unknown tool: ${name}`);
});

// Fonction principale
async function main() {
  console.error('🚀 Starting LLM Orchestrator Server...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ MCP Server connected and listening on stdio');
}

main().catch((error) => {
  console.error('💥 Error starting server:', error);
  process.exit(1);
}); 