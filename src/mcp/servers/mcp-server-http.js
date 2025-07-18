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
const express = require('express');
const cors = require('cors');

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

async function main() {
  try {
    // Initialize core services using unified logic
    const { ontologyService, chatService, neo4jConnection } = await initializeCoreServices();
    
    // Initialize NLP service
    const nlpClient = await initializeNLPService();
    
    const app = express();
    const PORT = process.env.MCP_HTTP_PORT || 3002;
    
    app.use(cors());
    app.use(express.json());
    
    // Get tool schemas from unified core
    const toolSchemas = getToolSchemas(ontologyService, neo4jConnection);
    const serverInfo = getServerInfo();
    
    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        ...serverInfo,
        endpoints: {
          health: 'GET /health',
          tools: 'GET /tools',
          call: 'POST /call',
          query: 'GET,POST /query',
          nlp: 'POST /nlp',
          'tools/query_knowledge_graph': 'GET,POST /tools/query_knowledge_graph',
          'tools/nlp_processing': 'GET,POST /tools/nlp_processing'
        }
      });
    });
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        ...serverInfo
      });
    });
    
    // Tools endpoint (MCP ListTools equivalent)
    app.get('/tools', (req, res) => {
      res.json({
        tools: [
          toolSchemas.query_knowledge_graph,
          toolSchemas.nlp_processing
        ]
      });
    });
    
    // REST-style tool endpoints for client compatibility
    app.get('/tools/query_knowledge_graph', (req, res) => {
      res.json(toolSchemas.query_knowledge_graph);
    });
    
    app.get('/tools/nlp_processing', (req, res) => {
      res.json(toolSchemas.nlp_processing);
    });
    
    // Query endpoint (MCP CallTool equivalent)
    app.post('/query', async (req, res) => {
      try {
        const { query } = req.body;
        const result = await processKnowledgeGraphQuery(chatService, query, mcpUser);
        
        res.json({
          content: result.content,
          query: result.query,
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
        const result = await processKnowledgeGraphQuery(chatService, q, mcpUser);
        
        res.json({
          content: result.content,
          query: result.query,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling query:', error);
        res.status(500).json({
          error: error.message
        });
      }
    });
    
    // REST-style call endpoint for client compatibility
    app.post('/call', async (req, res) => {
      try {
        const { tool, arguments: args } = req.body;
        
        if (!tool) {
          return res.status(400).json({
            error: 'Tool parameter is required'
          });
        }
        
        if (!args) {
          return res.status(400).json({
            error: 'Arguments parameter is required'
          });
        }
        
        let result;
        
        switch (tool) {
          case 'query_knowledge_graph':
            result = await processKnowledgeGraphQuery(chatService, args.query, mcpUser);
            break;
            
          case 'nlp_processing':
            if (!nlpClient) {
              return res.status(503).json({
                error: 'NLP service not available'
              });
            }
            const { operation, text, texts, ontology_name, database } = args;
            result = await processNLPOperation(nlpClient, operation, text, texts, ontology_name, database);
            break;
            
          default:
            return res.status(400).json({
              error: `Unknown tool: ${tool}. Supported tools: query_knowledge_graph, nlp_processing`
            });
        }
        
        res.json({
          tool,
          result,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling tool call:', error);
        res.status(500).json({
          error: error.message,
          tool: req.body.tool,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });
    
    // REST-style individual tool endpoints
    app.post('/tools/query_knowledge_graph', async (req, res) => {
      try {
        const { query } = req.body;
        const result = await processKnowledgeGraphQuery(chatService, query, mcpUser);
        
        res.json({
          content: result.content,
          query: result.query,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling query_knowledge_graph:', error);
        res.status(500).json({
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });
    
    app.post('/tools/nlp_processing', async (req, res) => {
      try {
        if (!nlpClient) {
          return res.status(503).json({
            error: 'NLP service not available'
          });
        }
        
        const { operation, text, texts, ontology_name, database } = req.body;
        const result = await processNLPOperation(nlpClient, operation, text, texts, ontology_name, database);
        
        res.json({
          operation,
          result,
          ontology_used: ontology_name || 'default',
          database_used: database || process.env.NEO4J_DATABASE || 'neo4j',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling nlp_processing:', error);
        res.status(500).json({
          error: error.message,
          operation: req.body.operation,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });
    
    // NLP processing endpoint
    app.post('/nlp', async (req, res) => {
      try {
        if (!nlpClient) {
          return res.status(503).json({
            error: 'NLP service not available'
          });
        }
        
        const { operation, text, texts, ontology_name, database } = req.body;
        const result = await processNLPOperation(nlpClient, operation, text, texts, ontology_name, database);
        
        res.json({
          operation,
          result,
          ontology_used: ontology_name || 'default',
          database_used: database || process.env.NEO4J_DATABASE || 'neo4j',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling NLP operation:', error);
        res.status(500).json({
          error: error.message,
          operation: req.body.operation,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 MCP HTTP Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Tools info: http://localhost:${PORT}/tools`);
      console.log(`📞 Call endpoint: http://localhost:${PORT}/call`);
      console.log(`❓ Query endpoint: http://localhost:${PORT}/query`);
      console.log(`🧠 NLP endpoint: http://localhost:${PORT}/nlp`);
      console.log(`🔧 Tool endpoints: http://localhost:${PORT}/tools/query_knowledge_graph, http://localhost:${PORT}/tools/nlp_processing`);
      console.log(`✅ Database: ${serverInfo.database}`);
      console.log(`🎯 Active ontologies: ${serverInfo.activeOntologies.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 