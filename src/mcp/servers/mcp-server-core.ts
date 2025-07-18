#!/usr/bin/env node

import 'reflect-metadata';
import { container } from 'tsyringe';
import { bootstrap } from '../../bootstrap';
import { OntologyService } from '@platform/ontology/ontology.service';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { pluginRegistry } from '../../../config/ontology/plugins.config';
import { NLPServiceClient } from '@platform/processing/nlp-service.client';
import { logger } from '@shared/utils/logger';

// Shared MCP user for all server types
export const mcpUser = {
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
export function loadOntologyEntities(ontologyName: string): Record<string, any> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const ontologyPath = path.join(process.cwd(), 'ontologies', ontologyName, 'ontology.json');
    if (!fs.existsSync(ontologyPath)) {
      return {};
    }
    
    const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));
    return ontologyData.entities || {};
  } catch (error: any) {
    logger.warn(`Could not load ontology ${ontologyName}: ${error.message}`);
    return {};
  }
}

/**
 * Generate query examples based on ontology entities
 */
export function generateOntologyExamples(ontologyName: string, entities: Record<string, any>): string {
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
export function generateToolDescription(ontologyService: OntologyService, neo4jConnection: Neo4jConnection): string {
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
 * Generate NLP tool description
 */
export function generateNLPToolDescription(): string {
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

/**
 * Configure active ontologies based on environment variable
 */
export function configureActiveOntologies(): void {
  const activeOntologiesEnv = process.env.MCP_ACTIVE_ONTOLOGIES;
  
  if (activeOntologiesEnv) {
    const requestedOntologies = activeOntologiesEnv.split(',').map(s => s.trim());
    logger.info(`Configuring active ontologies: ${requestedOntologies.join(', ')}`);
    
    // Disable all plugins first (including core and sp500)
    pluginRegistry.disableAllPlugins();
    
    // Enable only requested ontologies
    for (const ontology of requestedOntologies) {
      pluginRegistry.setPluginEnabled(ontology.toLowerCase(), true);
    }
    
    const summary = pluginRegistry.getPluginSummary();
    logger.info(`Active ontologies configured: ${summary.enabled.join(', ')}`);
  }
}

/**
 * Initialize core services
 */
export async function initializeCoreServices() {
  // Configure active ontologies if specified
  configureActiveOntologies();
  
  // Initialize all services using the existing bootstrap system
  bootstrap();
  
  // Get the services we need from the container
  const ontologyService = container.resolve(OntologyService);
  const chatService = container.resolve(ChatService);
  const neo4jConnection = container.resolve(Neo4jConnection);
  await neo4jConnection.connect();
  
  return { ontologyService, chatService, neo4jConnection };
}

/**
 * Initialize NLP service client
 */
export async function initializeNLPService(): Promise<NLPServiceClient | null> {
  try {
    const nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    const nlpClient = new NLPServiceClient(nlpServiceUrl);
    
    // Test NLP service connection
    const health = await nlpClient.healthCheck();
    logger.info(`NLP Service connected: ${health.status}`);
    return nlpClient;
  } catch (error: any) {
    logger.warn(`NLP Service not available: ${error.message}`);
    return null;
  }
}

/**
 * Process knowledge graph query with automatic limit
 */
export async function processKnowledgeGraphQuery(
  chatService: ChatService, 
  query: string, 
  user: any = mcpUser
): Promise<{ content: string; query: string }> {
  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string');
  }
  
  // Add default limit of 10 if not specified in query
  let limitedQuery = query;
  if (!query.toLowerCase().includes('limit') && !query.toLowerCase().includes('top')) {
    limitedQuery = `${query} LIMIT 10`;
  }
  
  const responseText = await chatService.handleQuery(user, limitedQuery);
  
  return {
    content: responseText,
    query: limitedQuery
  };
}

/**
 * Process NLP operation
 */
export async function processNLPOperation(
  nlpClient: NLPServiceClient,
  operation: string,
  text?: string,
  texts?: string[],
  ontology_name?: string,
  database?: string
): Promise<any> {
  if (!operation) {
    throw new Error('Operation parameter is required');
  }
  
  switch (operation) {
    case 'extract_entities':
      if (!text) {
        throw new Error('Text parameter is required for extract_entities operation');
      }
      return await nlpClient.extractEntities(text, ontology_name);
      
    case 'refine_entities':
      if (!text) {
        throw new Error('Text parameter is required for refine_entities operation');
      }
      return await nlpClient.refineEntities(text, ontology_name);
      
    case 'extract_graph':
      if (!text) {
        throw new Error('Text parameter is required for extract_graph operation');
      }
      return await nlpClient.extractGraph(text, ontology_name);
      
    case 'batch_extract_graph':
      if (!texts || !Array.isArray(texts)) {
        throw new Error('Texts parameter (array) is required for batch_extract_graph operation');
      }
      return await nlpClient.batchExtractGraph(texts, ontology_name);
      
    case 'generate_embeddings':
      if (!texts || !Array.isArray(texts)) {
        throw new Error('Texts parameter (array) is required for generate_embeddings operation');
      }
      return await nlpClient.generateEmbeddings(texts);
      
    default:
      throw new Error(`Unknown operation: ${operation}. Supported operations: extract_entities, refine_entities, extract_graph, batch_extract_graph, generate_embeddings`);
  }
}

/**
 * Get tool schemas for both knowledge graph and NLP tools
 */
export function getToolSchemas(ontologyService: OntologyService, neo4jConnection: Neo4jConnection) {
  const toolDescription = generateToolDescription(ontologyService, neo4jConnection);
  const nlpToolDescription = generateNLPToolDescription();
  
  return {
    query_knowledge_graph: {
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
    nlp_processing: {
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
  };
}

/**
 * Get server information
 */
export function getServerInfo() {
  return {
    server: 'mcp-unified-server',
    version: '2.0.0',
    database: process.env.NEO4J_DATABASE || 'neo4j',
    activeOntologies: pluginRegistry.getPluginSummary().enabled,
    timestamp: new Date().toISOString()
  };
} 