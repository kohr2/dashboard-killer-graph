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

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Import the unified core logic
const { 
  mcpUser,
  initializeCoreServices,
  initializeNLPService,
  processKnowledgeGraphQuery,
  processNLPOperation,
  getToolSchemas,
  getServerInfo
} = require('./mcp-server-core.ts');

// The Server implementation
async function main() {
  try {
    // Initialize core services using unified logic
    const { ontologyService, chatService, neo4jConnection } = await initializeCoreServices();
    
    // Initialize NLP service (optional)
    const nlpClient = await initializeNLPService();
    
    const mcpServer = new Server(
      {
        name: 'llm-orchestrator-platform',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Get tool schemas from unified core
    const toolSchemas = getToolSchemas(ontologyService, neo4jConnection);
    
    // Build the tool for STDIO (single tool with dynamic description)
    const queryTool = {
      name: 'queryGraph',
      description: toolSchemas.query_knowledge_graph.description,
      inputSchema: toolSchemas.query_knowledge_graph.inputSchema,
    };

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [queryTool],
    }));

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'queryGraph') {
        const query = request.params.arguments?.query;
        const database = request.params.arguments?.database;
        
        try {
          const result = await processKnowledgeGraphQuery(chatService, query, mcpUser, database);
          return {
            content: [{ type: 'text', text: result.content }],
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
    
    // Log startup info to stderr (won't interfere with MCP protocol)
    const serverInfo = getServerInfo();
    process.stderr.write(`🚀 MCP STDIO Server started\n`);
    process.stderr.write(`📊 Database: ${serverInfo.database}\n`);
    process.stderr.write(`🎯 Active ontologies: ${serverInfo.activeOntologies.join(', ')}\n`);
    
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