import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { ContactOntology } from './domain/entities/contact-ontology';
import { SpacyEntityExtractionService } from './application/services/spacy-entity-extraction.service';

export function registerCrm() {
  const ontologyService = container.resolve(OntologyService);

  ontologyService.registerEntityType(
    'OCreamContact',
    ContactOntology.createOCreamContact,
  );

  // TODO: Register Organization entity once it is defined.
  
  console.log('✅ CRM extension registered.');
} 