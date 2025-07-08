import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';

/**
 * Register the procurement ontology with the ontology service
 */
export function registerProcurement(): void {
  const ontologyService = container.resolve(OntologyService);
  
  // Procurement ontology is primarily for entity extraction and reasoning
  // No specific services to register for now
  
  logger.info('✅ Procurement ontology registered.');
}

/**
 * Default register function for compatibility with e2e tests
 */
export function register(): void {
  registerProcurement();
} 