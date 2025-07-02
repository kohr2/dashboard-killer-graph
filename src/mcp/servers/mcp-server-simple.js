#!/usr/bin/env node

// CRITICAL: Capture and redirect all stdout pollution before any module loading
// Store the original stdout.write
const originalStdoutWrite = process.stdout.write;

// Override stdout.write to redirect to stderr (except for JSON-RPC messages)
process.stdout.write = function(chunk, encoding, callback) {
  // Convert chunk to string if it's a buffer
  const str = chunk.toString();
  
  // Only allow JSON-RPC messages through (they start with { and contain "jsonrpc")
  if (str.trim().startsWith('{') && str.includes('"jsonrpc"')) {
    return originalStdoutWrite.call(this, chunk, encoding, callback);
  }
  
  // For everything else (like the dotenv message), silently ignore it
  // instead of redirecting to stderr.
  return true;
};

// Set environment variables to silence logs specifically for the MCP server context
process.env.LOG_SILENT = 'true';
process.env.DOTENV_CONFIG_DEBUG = 'false';

// --- Self-Contained Path Resolution ---
const path = require('path');
// Resolve the project root dynamically from the current script's location
const projectRoot = path.resolve(__dirname, '../../../');
process.chdir(projectRoot); // Set the current working directory to the project root

// Manually load and register ts-node and tsconfig-paths
require('ts-node').register({
  project: path.join(projectRoot, 'tsconfig.json'),
  transpileOnly: true, // Faster startup
});

const tsconfig = require(path.join(projectRoot, 'tsconfig.json'));
require('tsconfig-paths').register({
  baseUrl: path.join(projectRoot, '.'),
  paths: tsconfig.compilerOptions.paths,
});
// --- End Self-Contained Path Resolution ---

require('reflect-metadata');
const { container } = require('tsyringe');

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Import the bootstrap function to initialize all services properly
const { bootstrap } = require('../../bootstrap');

// A mock user for the MCP server context, conforming to the User and Role interfaces.
const mcpUser = {
  id: 'mcp-server-user',
  username: 'mcp-server',
  roles: [
    { 
      name: 'admin',
      permissions: [{ action: '*', resource: '*' }]
    }
  ],
};

// The Server implementation
async function main() {
  try {
    // Initialize all services using the existing bootstrap system
    bootstrap();
    
    // Get the services we need from the container
    const { OntologyService } = require('@platform/ontology/ontology.service');
    const { ChatService } = require('@platform/chat/application/services/chat.service');
    const { Neo4jConnection } = require('@platform/database/neo4j-connection');
    
    const ontologyService = container.resolve(OntologyService);
    const chatService = container.resolve(ChatService);
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    
    const mcpServer = new Server(
      {
        name: 'llm-orchestrator-platform',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Build the tool description with the live schema
    const schemaDescription = ontologyService.getSchemaRepresentation();
    const queryTool = {
      name: 'queryGraph',
      description: `Processes a natural language query against the enterprise knowledge graph.
The query will be translated into a Cypher query and executed.
The available graph schema is as follows, you can query for any of these entities and their relationships:
---
${schemaDescription}
---
Examples:
- "Show me all deals for the company 'BlueWave'"
- "Find contacts related to the deal 'Project Alpha'"
- "List companies in the technology sector"`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The natural language query to execute.',
          },
        },
        required: ['query'],
      },
    };

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [queryTool],
    }));

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'queryGraph') {
        const query = request.params.arguments?.query;
        if (typeof query !== 'string') {
          throw new Error("The 'query' parameter must be a string.");
        }

        try {
          // Use the chat service to process queries (reuses all existing logic)
          const responseText = await chatService.handleQuery(mcpUser, query);
          return {
            content: [{ type: 'text', text: responseText }],
          };
        } catch (error) {
          process.stderr.write(`Error handling query: ${error.stack}\n`);
          return {
            content: [{ type: 'text', text: `An error occurred: ${error.message}` }],
          };
        }
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  } catch (error) {
    process.stderr.write(`Failed to start server: ${error.stack}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  // Use stderr for logging errors to not interfere with the protocol
  process.stderr.write(`Failed to start server: ${error.stack}\n`);
  process.exit(1);
}); 