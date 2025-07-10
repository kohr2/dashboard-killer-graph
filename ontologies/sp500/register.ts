import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';

/**
 * Register the companies ontology with the ontology service
 */
export function registerCompanies(): void {
  const ontologyService = container.resolve(OntologyService);
  
  // Companies ontology is primarily for entity extraction and reasoning
  // No specific services to register for now
  
  logger.info('✅ Companies ontology registered.');
} 