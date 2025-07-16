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
const { NLPServiceClient } = require('@platform/processing/nlp-service.client');

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
    
    // Disable all plugins first
    const allPlugins = pluginRegistry.getPluginDetails();
    for (const plugin of allPlugins) {
      pluginRegistry.setPluginEnabled(plugin.name, false);
    }
    
    // Enable only requested ontologies
    for (const ontology of requestedOntologies) {
      pluginRegistry.setPluginEnabled(ontology.toLowerCase(), true);
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

function generateNLPToolDescription() {
  return `Process text using Natural Language Processing (NLP) services.\n\n` +
         `**Available Operations**:\n` +
         `- Entity extraction (raw spaCy)\n` +
         `- Entity refinement (spaCy + LLM)\n` +
         `- Knowledge graph extraction\n` +
         `- Batch processing\n` +
         `- Embedding generation\n\n` +
         `**Available Ontologies**:\n` +
         `- financial: Companies, people, monetary amounts\n` +
         `- procurement: Contracts, suppliers, amounts\n` +
         `- crm: People, companies, opportunities\n` +
         `- default: General purpose extraction\n\n` +
         `**Example Operations**:\n` +
         `- "extract entities from [text]" - Extract named entities\n` +
         `- "extract graph from [text] using [ontology]" - Generate knowledge graph\n` +
         `- "generate embeddings for [texts]" - Create vector embeddings\n` +
         `- "batch process [texts] with [ontology]" - Process multiple texts`;
}

async function main() {
  try {
    configureActiveOntologies();
    bootstrap();
    
    const ontologyService = container.resolve(OntologyService);
    const chatService = container.resolve(ChatService);
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    
    // Initialize NLP service client
    const nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    const nlpClient = new NLPServiceClient(nlpServiceUrl);
    
    // Test NLP service connection
    try {
      const health = await nlpClient.healthCheck();
      console.log(`✅ NLP Service connected: ${health.status}`);
    } catch (error) {
      console.warn(`⚠️ NLP Service not available: ${error.message}`);
    }
    
    const app = express();
    const PORT = process.env.MCP_HTTP_PORT || 3002;
    
    app.use(cors());
    app.use(express.json());
    
    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        server: 'mcp-http-server',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          tools: 'GET /tools',
          call: 'POST /call',
          query: 'POST /query',
          nlp: 'POST /nlp',
          'tools/query_knowledge_graph': 'GET,POST /tools/query_knowledge_graph',
          'tools/nlp_processing': 'GET,POST /tools/nlp_processing'
        },
        database: process.env.NEO4J_DATABASE || 'neo4j',
        activeOntologies: pluginRegistry.getPluginSummary().enabled
      });
    });
    
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
      const nlpToolDescription = generateNLPToolDescription();
      
      res.json({
        tools: [
          {
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
          },
          {
            name: 'nlp_processing',
            description: nlpToolDescription,
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'The NLP operation to perform: extract_entities, refine_entities, extract_graph, batch_extract_graph, generate_embeddings',
                  enum: ['extract_entities', 'refine_entities', 'extract_graph', 'batch_extract_graph', 'generate_embeddings']
                },
                text: {
                  type: 'string',
                  description: 'The text to process (for single text operations)',
                },
                texts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of texts to process (for batch operations)',
                },
                ontology_name: {
                  type: 'string',
                  description: 'Optional ontology name to scope the extraction (financial, procurement, crm, default)',
                  enum: ['financial', 'procurement', 'crm', 'default']
                },
              },
              required: ['operation'],
            },
          }
        ]
      });
    });
    
    // REST-style tool endpoints for client compatibility
    app.get('/tools/query_knowledge_graph', (req, res) => {
      const toolDescription = generateToolDescription(ontologyService, neo4jConnection);
      res.json({
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
      });
    });
    
    app.get('/tools/nlp_processing', (req, res) => {
      const nlpToolDescription = generateNLPToolDescription();
      res.json({
        name: 'nlp_processing',
        description: nlpToolDescription,
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'The NLP operation to perform: extract_entities, refine_entities, extract_graph, batch_extract_graph, generate_embeddings',
              enum: ['extract_entities', 'refine_entities', 'extract_graph', 'batch_extract_graph', 'generate_embeddings']
            },
            text: {
              type: 'string',
              description: 'The text to process (for single text operations)',
            },
            texts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of texts to process (for batch operations)',
            },
            ontology_name: {
              type: 'string',
              description: 'Optional ontology name to scope the extraction (financial, procurement, crm, default)',
              enum: ['financial', 'procurement', 'crm', 'default']
            },
          },
          required: ['operation'],
        },
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
            if (!args.query || typeof args.query !== 'string') {
              return res.status(400).json({
                error: 'Query parameter is required for query_knowledge_graph tool'
              });
            }
            
            let limitedQuery = args.query;
            if (!args.query.toLowerCase().includes('limit') && !args.query.toLowerCase().includes('top')) {
              limitedQuery = `${args.query} LIMIT 10`;
            }
            
            const responseText = await chatService.handleQuery(mcpUser, limitedQuery);
            result = {
              content: responseText,
              query: limitedQuery
            };
            break;
            
          case 'nlp_processing':
            const { operation, text, texts, ontology_name } = args;
            
            if (!operation) {
              return res.status(400).json({
                error: 'Operation parameter is required for nlp_processing tool'
              });
            }
            
            switch (operation) {
              case 'extract_entities':
                if (!text) {
                  return res.status(400).json({
                    error: 'Text parameter is required for extract_entities operation'
                  });
                }
                result = await nlpClient.extractEntities(text, ontology_name);
                break;
                
              case 'refine_entities':
                if (!text) {
                  return res.status(400).json({
                    error: 'Text parameter is required for refine_entities operation'
                  });
                }
                result = await nlpClient.refineEntities(text, ontology_name);
                break;
                
              case 'extract_graph':
                if (!text) {
                  return res.status(400).json({
                    error: 'Text parameter is required for extract_graph operation'
                  });
                }
                result = await nlpClient.extractGraph(text, ontology_name);
                break;
                
              case 'batch_extract_graph':
                if (!texts || !Array.isArray(texts)) {
                  return res.status(400).json({
                    error: 'Texts parameter (array) is required for batch_extract_graph operation'
                  });
                }
                result = await nlpClient.batchExtractGraph(texts, ontology_name);
                break;
                
              case 'generate_embeddings':
                if (!texts || !Array.isArray(texts)) {
                  return res.status(400).json({
                    error: 'Texts parameter (array) is required for generate_embeddings operation'
                  });
                }
                result = await nlpClient.generateEmbeddings(texts);
                break;
                
              default:
                return res.status(400).json({
                  error: `Unknown operation: ${operation}. Supported operations: extract_entities, refine_entities, extract_graph, batch_extract_graph, generate_embeddings`
                });
            }
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
        
        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            error: 'Query parameter is required and must be a string'
          });
        }
        
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
        console.error('Error handling query_knowledge_graph:', error);
        res.status(500).json({
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });
    
    app.post('/tools/nlp_processing', async (req, res) => {
      try {
        const { operation, text, texts, ontology_name, database } = req.body;
        
        if (!operation) {
          return res.status(400).json({
            error: 'Operation parameter is required'
          });
        }
        
        let result;
        
        switch (operation) {
          case 'extract_entities':
            if (!text) {
              return res.status(400).json({
                error: 'Text parameter is required for extract_entities operation'
              });
            }
            result = await nlpClient.extractEntities(text, ontology_name, database);
            break;
            
          case 'refine_entities':
            if (!text) {
              return res.status(400).json({
                error: 'Text parameter is required for refine_entities operation'
              });
            }
            result = await nlpClient.refineEntities(text, ontology_name, database);
            break;
            
          case 'extract_graph':
            if (!text) {
              return res.status(400).json({
                error: 'Text parameter is required for extract_graph operation'
              });
            }
            result = await nlpClient.extractGraph(text, ontology_name, database);
            break;
            
          case 'batch_extract_graph':
            if (!texts || !Array.isArray(texts)) {
              return res.status(400).json({
                error: 'Texts parameter (array) is required for batch_extract_graph operation'
              });
            }
            result = await nlpClient.batchExtractGraph(texts, ontology_name, database);
            break;
            
          case 'generate_embeddings':
            if (!texts || !Array.isArray(texts)) {
              return res.status(400).json({
                error: 'Texts parameter (array) is required for generate_embeddings operation'
              });
            }
            result = await nlpClient.generateEmbeddings(texts);
            break;
            
          default:
            return res.status(400).json({
              error: `Unknown operation: ${operation}. Supported operations: extract_entities, refine_entities, extract_graph, batch_extract_graph, generate_embeddings`
            });
        }
        
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
    
    // NLP processing endpoint
    app.post('/nlp', async (req, res) => {
      try {
        const { operation, text, texts, ontology_name, database } = req.body;
        
        if (!operation) {
          return res.status(400).json({
            error: 'Operation parameter is required'
          });
        }
        
        let result;
        
        switch (operation) {
          case 'extract_entities':
            if (!text) {
              return res.status(400).json({
                error: 'Text parameter is required for extract_entities operation'
              });
            }
            result = await nlpClient.extractEntities(text, ontology_name, database);
            break;
            
          case 'refine_entities':
            if (!text) {
              return res.status(400).json({
                error: 'Text parameter is required for refine_entities operation'
              });
            }
            result = await nlpClient.refineEntities(text, ontology_name, database);
            break;
            
          case 'extract_graph':
            if (!text) {
              return res.status(400).json({
                error: 'Text parameter is required for extract_graph operation'
              });
            }
            result = await nlpClient.extractGraph(text, ontology_name, database);
            break;
            
          case 'batch_extract_graph':
            if (!texts || !Array.isArray(texts)) {
              return res.status(400).json({
                error: 'Texts parameter (array) is required for batch_extract_graph operation'
              });
            }
            result = await nlpClient.batchExtractGraph(texts, ontology_name, database);
            break;
            
          case 'generate_embeddings':
            if (!texts || !Array.isArray(texts)) {
              return res.status(400).json({
                error: 'Texts parameter (array) is required for generate_embeddings operation'
              });
            }
            result = await nlpClient.generateEmbeddings(texts);
            break;
            
          default:
            return res.status(400).json({
              error: `Unknown operation: ${operation}. Supported operations: extract_entities, refine_entities, extract_graph, batch_extract_graph, generate_embeddings`
            });
        }
        
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