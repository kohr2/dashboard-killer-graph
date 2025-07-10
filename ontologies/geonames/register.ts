import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';

/**
 * Register the GeoNames ontology with the ontology service
 */
export function registerGeonames(): void {
  const ontologyService = container.resolve(OntologyService);
  // No specific services to register for now
  logger.info('✅ GeoNames ontology registered.');
} 