#!/usr/bin/env node
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { container } from 'tsyringe';
import { QueryTranslator } from './platform/chat/application/services/query-translator.service';
import './register-ontologies';
import { logger } from '@shared/utils/logger';

const app = express();
const port = process.env.MCP_PORT || 3000;

app.use(express.json());

// This function creates and configures a new server instance.
// It's called for each request to ensure statelessness.
function createMcpServer(): Server {
  const mcpServer = new Server(
    {
      name: 'llm-orchestrator-server-online',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

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

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.error('📋 ListTools called');
    return {
      tools: [queryTool],
    };
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.error(`🔧 CallTool called with: ${request.params.name}`);
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
        logger.error(`✅ Response sent:`, result);
        return result;
      } catch (error) {
        logger.error('💥 Error during query translation:', error);
        throw new Error('Failed to translate query');
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return mcpServer;
}

// Handle POST requests in a stateless manner
app.post('/mcp', async (req: Request, res: Response) => {
  logger.info('Incoming POST /mcp request');
  // For stateless mode, we create a new server and transport for each request
  // to ensure isolation and prevent request ID collisions.
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Indicates stateless mode
  });

  // Clean up server and transport when the client connection closes
  res.on('close', () => {
    logger.info('Request closed, cleaning up resources.');
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal Server Error' },
        id: (req.body as any)?.id ?? null,
      });
    }
  }
});

// GET and DELETE are not supported in this simple stateless implementation
app.get('/mcp', (req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32601, message: 'Method Not Allowed' },
    id: null
  });
});

app.delete('/mcp', (req: Request, res: Response) => {
    res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32601, message: 'Method Not Allowed' },
    id: null
  });
});

// Démarrer le serveur
app.listen(port, () => {
  logger.info(`🚀 MCP Server is online and listening at http://localhost:${port}/mcp`);
}); 