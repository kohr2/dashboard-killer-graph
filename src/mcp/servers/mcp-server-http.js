#!/usr/bin/env node

// CRITICAL: Capture and redirect all stdout pollution before any module loading
const originalStdoutWrite = process.stdout.write;

process.stdout.write = function(chunk, encoding, callback) {
  const str = chunk.toString();
  if (str.trim().startsWith('{') && str.includes('"jsonrpc"')) {
    return originalStdoutWrite.call(this, chunk, encoding, callback);
  }
  return true;
};

process.env.LOG_SILENT = 'true';
process.env.DOTENV_CONFIG_DEBUG = 'false';

const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
process.chdir(projectRoot);

require('ts-node').register({
  project: path.join(projectRoot, 'tsconfig.json'),
  transpileOnly: true,
});

const tsconfig = require(path.join(projectRoot, 'tsconfig.json'));
require('tsconfig-paths').register({
  baseUrl: path.join(projectRoot, '.'),
  paths: tsconfig.compilerOptions.paths,
});

require('reflect-metadata');
const { container } = require('tsyringe');
const express = require('express');
const cors = require('cors');

const { bootstrap } = require('../../bootstrap');
const { OntologyService } = require('@platform/ontology/ontology.service');
const { ChatService } = require('@platform/chat/application/services/chat.service');
const { Neo4jConnection } = require('@platform/database/neo4j-connection');
const { pluginRegistry } = require('../../../config/ontology/plugins.config');

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

function configureActiveOntologies() {
  const activeOntologiesEnv = process.env.MCP_ACTIVE_ONTOLOGIES;
  
  if (activeOntologiesEnv) {
    const requestedOntologies = activeOntologiesEnv.split(',').map(s => s.trim());
    console.log(`🔧 Configuring active ontologies: ${requestedOntologies.join(', ')}`);
    
    const allPlugins = pluginRegistry.getPluginDetails();
    for (const plugin of allPlugins) {
      pluginRegistry.setPluginEnabled(plugin.name, false);
    }
    
    pluginRegistry.setPluginEnabled('core', true);
    for (const ontology of requestedOntologies) {
      if (ontology.toLowerCase() !== 'core') {
        pluginRegistry.setPluginEnabled(ontology.toLowerCase(), true);
      }
    }
    
    const summary = pluginRegistry.getPluginSummary();
    console.log(`✅ Active ontologies configured: ${summary.enabled.join(', ')}`);
  }
}

function generateToolDescription(ontologyService, neo4jConnection) {
  const activeOntologies = pluginRegistry.getPluginSummary().enabled;
  const databaseName = process.env.NEO4J_DATABASE || 'neo4j';
  
  const entityTypes = ontologyService.getAllEntityTypes();
  const relationshipTypes = ontologyService.getAllRelationshipTypes();
  
  let description = `Query the knowledge graph with ${activeOntologies.length} active ontologies.\n\n`;
  description += `**Active Ontologies**: ${activeOntologies.join(', ')}\n`;
  description += `**Database**: ${databaseName}\n`;
  description += `**Entity Types**: ${entityTypes.length} types available\n`;
  description += `**Relationship Types**: ${relationshipTypes.length} types available\n\n`;
  
  description += `**Common Query Patterns**:\n`;
  description += `- "show all [EntityType]" - List entities of specific type\n`;
  description += `- "find [EntityName]" - Search for specific entities\n`;
  description += `- "relationships for [EntityName]" - Show entity connections\n`;
  description += `- "count [EntityType]" - Get entity counts\n\n`;
  
  description += `Results are automatically limited to 10 items for optimal performance.`;
  
  return description;
}

async function main() {
  try {
    configureActiveOntologies();
    bootstrap();
    
    const ontologyService = container.resolve(OntologyService);
    const chatService = container.resolve(ChatService);
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    
    const app = express();
    const PORT = process.env.MCP_HTTP_PORT || 3002;
    
    app.use(cors());
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        server: 'mcp-http-server',
        version: '1.0.0',
        database: process.env.NEO4J_DATABASE || 'neo4j',
        activeOntologies: pluginRegistry.getPluginSummary().enabled
      });
    });
    
    // Tools endpoint (MCP ListTools equivalent)
    app.get('/tools', (req, res) => {
      const toolDescription = generateToolDescription(ontologyService, neo4jConnection);
      
      res.json({
        tools: [{
          name: 'query_knowledge_graph',
          description: toolDescription,
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
        }]
      });
    });
    
    // Query endpoint (MCP CallTool equivalent)
    app.post('/query', async (req, res) => {
      try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            error: 'Query parameter is required and must be a string'
          });
        }
        
        // Add default limit of 10 if not specified
        let limitedQuery = query;
        if (!query.toLowerCase().includes('limit') && !query.toLowerCase().includes('top')) {
          limitedQuery = `${query} LIMIT 10`;
        }
        
        const responseText = await chatService.handleQuery(mcpUser, limitedQuery);
        
        res.json({
          content: responseText,
          query: limitedQuery,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling query:', error);
        res.status(500).json({
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });
    
    // Simple query endpoint for easier integration
    app.get('/query', async (req, res) => {
      try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string') {
          return res.status(400).json({
            error: 'Query parameter "q" is required'
          });
        }
        
        let limitedQuery = q;
        if (!q.toLowerCase().includes('limit') && !q.toLowerCase().includes('top')) {
          limitedQuery = `${q} LIMIT 10`;
        }
        
        const responseText = await chatService.handleQuery(mcpUser, limitedQuery);
        
        res.json({
          content: responseText,
          query: limitedQuery,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling query:', error);
        res.status(500).json({
          error: error.message
        });
      }
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 MCP HTTP Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Tools info: http://localhost:${PORT}/tools`);
      console.log(`❓ Query endpoint: http://localhost:${PORT}/query`);
      console.log(`✅ Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);
      console.log(`🎯 Active ontologies: ${pluginRegistry.getPluginSummary().enabled.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Failed to start HTTP server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 