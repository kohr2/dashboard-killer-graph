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

// Import the bootstrap function and services BEFORE calling bootstrap
const { bootstrap } = require('../../bootstrap');
const { OntologyService } = require('@platform/ontology/ontology.service');
const { ChatService } = require('@platform/chat/application/services/chat.service');
const { Neo4jConnection } = require('@platform/database/neo4j-connection');
const { pluginRegistry } = require('../../../config/ontology/plugins.config');

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

/**
 * Load ontology entities from JSON file
 */
function loadOntologyEntities(ontologyName) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const ontologyPath = path.join(process.cwd(), 'ontologies', ontologyName, 'ontology.json');
    if (!fs.existsSync(ontologyPath)) {
      return {};
    }
    
    const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));
    return ontologyData.entities || {};
  } catch (error) {
    process.stderr.write(`Warning: Could not load ontology ${ontologyName}: ${error.message}\n`);
    return {};
  }
}

/**
 * Generate query examples based on ontology entities
 */
function generateOntologyExamples(ontologyName, entities) {
  const entityNames = Object.keys(entities);
  if (entityNames.length === 0) return '';
  
  // Get most relevant entities (limit to 3-4 for brevity)
  const relevantEntities = entityNames
    .filter(name => entities[name] && entities[name].vectorIndex !== false)
    .slice(0, 4);
  
  if (relevantEntities.length === 0) {
    // Fallback to any entities
    relevantEntities.push(...entityNames.slice(0, 3));
  }
  
  const examples = relevantEntities.map(entity => `"show all ${entity}"`).join(', ');
  return `**${ontologyName.charAt(0).toUpperCase() + ontologyName.slice(1)} Queries**: ${examples}\n`;
}

/**
 * Generate dynamic tool description based on active ontologies
 */
function generateToolDescription(ontologyService, neo4jConnection) {
  const activeOntologies = pluginRegistry.getPluginSummary().enabled;
  const databaseName = process.env.NEO4J_DATABASE || 'neo4j';
  
  // Get entity counts and types from ontology service
  const entityTypes = ontologyService.getAllEntityTypes();
  const relationshipTypes = ontologyService.getAllRelationshipTypes();
  
  // Build description dynamically
  let description = `Query the knowledge graph with ${activeOntologies.length} active ontologies.\n\n`;
  
  description += `**Active Ontologies**: ${activeOntologies.join(', ')}\n`;
  description += `**Database**: ${databaseName}\n`;
  description += `**Entity Types**: ${entityTypes.length} types available\n`;
  description += `**Relationship Types**: ${relationshipTypes.length} types available\n\n`;
  
  // Add common query examples
  description += `**Common Query Patterns**:\n`;
  description += `- "show all [EntityType]" - List entities of specific type\n`;
  description += `- "find [EntityName]" - Search for specific entities\n`;
  description += `- "relationships for [EntityName]" - Show entity connections\n`;
  description += `- "count [EntityType]" - Get entity counts\n\n`;
  
  // Generate specific examples based on actual ontology entities
  for (const ontologyName of activeOntologies) {
    if (ontologyName === 'core') continue; // Skip core ontology for examples
    
    const entities = loadOntologyEntities(ontologyName);
    const examples = generateOntologyExamples(ontologyName, entities);
    if (examples) {
      description += examples;
    }
  }
  
  description += `\nResults are automatically limited to 10 items for optimal performance.`;
  
  return description;
}

/**
 * Configure active ontologies based on environment variable
 */
function configureActiveOntologies() {
  const activeOntologiesEnv = process.env.MCP_ACTIVE_ONTOLOGIES;
  
  if (activeOntologiesEnv) {
    const requestedOntologies = activeOntologiesEnv.split(',').map(s => s.trim());
    process.stderr.write(`🔧 Configuring active ontologies: ${requestedOntologies.join(', ')}\n`);
    
    // Disable all plugins first
    const allPlugins = pluginRegistry.getPluginDetails();
    for (const plugin of allPlugins) {
      pluginRegistry.setPluginEnabled(plugin.name, false);
    }
    
    // Enable core (always required) and requested ontologies
    pluginRegistry.setPluginEnabled('core', true);
    for (const ontology of requestedOntologies) {
      if (ontology.toLowerCase() !== 'core') {
        pluginRegistry.setPluginEnabled(ontology.toLowerCase(), true);
      }
    }
    
    const summary = pluginRegistry.getPluginSummary();
    process.stderr.write(`✅ Active ontologies configured: ${summary.enabled.join(', ')}\n`);
  }
}

// The Server implementation
async function main() {
  try {
    // Configure active ontologies if specified
    configureActiveOntologies();
    
    // Initialize all services using the existing bootstrap system
    bootstrap();
    
    // Get the services we need from the container
    const ontologyService = container.resolve(OntologyService);
    const chatService = container.resolve(ChatService);
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    
    const mcpServer = new Server(
      {
        name: 'llm-orchestrator-platform',
        version: '1.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Build the tool description dynamically based on active ontologies
    const queryTool = {
      name: 'queryGraph',
      description: generateToolDescription(ontologyService, neo4jConnection),
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The natural language query to execute against the knowledge graph.',
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
          // Add default limit of 10 if not specified in query
          let limitedQuery = query;
          if (!query.toLowerCase().includes('limit') && !query.toLowerCase().includes('top')) {
            limitedQuery = `${query} LIMIT 10`;
          }
          
          // Use the chat service to process queries (reuses all existing logic)
          const responseText = await chatService.handleQuery(mcpUser, limitedQuery);
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