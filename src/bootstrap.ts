import 'reflect-metadata';
import { registerAllOntologies } from './register-ontologies';
import { registerAvailableEnrichmentServices } from './register-enrichment-services';
import { container } from 'tsyringe';
import OpenAI from 'openai';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { ReasoningOrchestratorService } from '@platform/reasoning/reasoning-orchestrator.service';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { Neo4jIngestionService } from '@platform/processing/neo4j-ingestion.service';
import { EnrichmentOrchestratorService } from '@platform/enrichment/enrichment-orchestrator.service';
import { logger } from '@shared/utils/logger';

/**
 * Centralized bootstrap for scripts, tests and the API.  
 * Call this once at application start to ensure all ontologies and DI
 * bindings are registered consistently.
 */
export function bootstrap(): void {
  logger.info('🚀 Bootstrap starting...');
  
  // Register services in the correct order of dependency
  container.registerSingleton(OntologyService);
  
  // Register OpenAI with the API key
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) {
    logger.warn('⚠️ OPENAI_API_KEY is not set. Chat functionality will be limited.');
  }
  container.register('OpenAI', {
    useValue: new OpenAI({ apiKey: openAIKey }),
  });

  // Register other singletons
  container.registerSingleton(Neo4jConnection);
  container.registerSingleton(AccessControlService);
  container.registerSingleton(QueryTranslator);
  container.registerSingleton(ChatService);
  container.registerSingleton(ReasoningOrchestratorService);
  container.registerSingleton(EnrichmentOrchestratorService);
  container.registerSingleton(ContentProcessingService);
  container.registerSingleton(Neo4jIngestionService);

  // Register available enrichment services with the orchestrator
  const orchestrator = container.resolve(EnrichmentOrchestratorService);
  const { registerAvailableEnrichmentServices } = require('./register-enrichment-services');
  registerAvailableEnrichmentServices(orchestrator);
  
  // Register available enrichment services from config
  logger.info('Registering enrichment services from config...');
  // registerAvailableEnrichmentServices(); // This line is now redundant as it's handled by the orchestrator
  
  // Immediately load ontology data into the singleton
  logger.info('Loading ontology data into singleton...');
  registerAllOntologies();
  
  logger.info('✅ Bootstrap completed');
} 