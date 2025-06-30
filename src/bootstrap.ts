import 'reflect-metadata';
import { registerAllOntologies } from './register-ontologies';
import { container } from 'tsyringe';
import { AccessControlService } from './platform/security/application/services/access-control.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';

/**
 * Centralized bootstrap for scripts, tests and the API.  
 * Call this once at application start to ensure all ontologies and DI
 * bindings are registered consistently.
 */
export function registerDependencies(): void {
  // Register the OntologyService singleton FIRST before any other services
  logger.info('Registering OntologyService singleton...');
  container.registerSingleton(OntologyService);
  
  // Immediately load ontology data into the singleton
  logger.info('Loading ontology data into singleton...');
  registerAllOntologies();
  
  // Register other singletons after ontology is loaded
  container.registerSingleton(AccessControlService);
}

export function bootstrap(): void {
  logger.info('🚀 Bootstrap starting...');
  registerDependencies();
  logger.info('✅ Dependencies registered');
  logger.info('✅ Bootstrap completed');
} 