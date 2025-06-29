#!/usr/bin/env node

// Set environment variables to silence logs specifically for the MCP server context
process.env.LOG_SILENT = 'true';
process.env.DOTENV_CONFIG_DEBUG = 'false';

require('ts-node').register();

// Programmatically register tsconfig-paths
const tsconfigPaths = require('tsconfig-paths');
const path = require('path');
// __dirname is .../src/mcp/servers, so project root is 3 levels up
const projectRoot = path.resolve(__dirname, '../../../'); 
const tsconfig = require(path.join(projectRoot, 'tsconfig.json'));

tsconfigPaths.register({
  baseUrl: path.join(projectRoot, '.'),
  paths: tsconfig.compilerOptions.paths,
});

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
require('reflect-metadata');
const { container } = require('tsyringe');

// Since we are in a pure JS file, we manually register dependencies
const { Neo4jConnection } = require('@platform/database/neo4j-connection');
const { OntologyService } = require('@platform/ontology/ontology.service');
const { QueryTranslator } = require('@platform/chat/application/services/query-translator.service');
const { ChatService } = require('@platform/chat/application/services/chat.service');
const { AccessControlService } = require('@platform/security/application/services/access-control.service');

// --- Dependency Injection Setup ---
const connection = Neo4jConnection.getInstance();
container.register("Neo4jConnection", { useValue: connection });
container.register("OntologyService", { useClass: OntologyService });
container.register("QueryTranslator", { useClass: QueryTranslator });
container.register("AccessControlService", { useClass: AccessControlService });
container.register("ChatService", { useClass: ChatService });
// ---------------------------------

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
  await connection.connect();
  const chatService = container.resolve(ChatService);
  
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

  const queryTool = {
    name: 'queryGraph',
    description: `Processes a natural language query against the enterprise knowledge graph. 
This tool can understand queries about CRM and financial data, including contacts, organizations, deals, and their relationships.
Examples:
- "Show me all deals"
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
        const responseText = await chatService.handleQuery(mcpUser, query);
        return {
          content: [{ type: 'text', text: responseText }],
        };
      } catch (error) {
        // In a real app, use a structured logger writing to stderr
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
}

main().catch((error) => {
  // Use stderr for logging errors to not interfere with the protocol
  process.stderr.write(`Failed to start server: ${error.stack}\n`);
  process.exit(1);
}); 