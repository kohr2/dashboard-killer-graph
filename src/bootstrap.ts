import 'reflect-metadata';
import { registerAllOntologies } from './register-ontologies';
import { container } from 'tsyringe';
import OpenAI from 'openai';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
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

  // Immediately load ontology data into the singleton
  logger.info('Loading ontology data into singleton...');
  registerAllOntologies();
  
  logger.info('✅ Bootstrap completed');
} 