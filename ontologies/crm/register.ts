import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { ContactOntology } from './domain/entities/contact-ontology';
import { SpacyEntityExtractionService } from './application/services/spacy-entity-extraction.service';
import { Neo4jContactRepository } from './infrastructure/repositories/neo4j-contact-repository';
import { logger } from '@shared/utils/logger';
import { Neo4jOrganizationRepository } from './infrastructure/repositories/neo4j-organization-repository';
import { CreateOrganizationUseCase } from './application/use-cases/organization/create-organization.use-case';

export function registerCrm() {
  // Register repositories
  container.register('ContactRepository', {
    useClass: Neo4jContactRepository,
  });

  container.register('IOrganizationRepository', {
    useClass: Neo4jOrganizationRepository,
  });

  // Register use cases
  container.register(CreateOrganizationUseCase, {
    useClass: CreateOrganizationUseCase,
  });

  const ontologyService = container.resolve(OntologyService);

  ontologyService.registerEntityType(
    'OCreamContact',
    ContactOntology.createOCreamContact,
  );

  // TODO: Register Organization entity once it is defined.
  
  logger.info('✅ CRM extension registered.');
} 