import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';

/**
 * Register the FIBO ontology with the ontology service
 */
export function registerFibo(): void {
  const ontologyService = container.resolve(OntologyService);
  
  // FIBO ontology is primarily for entity extraction and reasoning
  // No specific services to register for now
  
  logger.info('✅ FIBO ontology registered.');
}

/**
 * Default register function for compatibility with e2e tests
 */
export function register(): void {
  registerFibo();
} 