// Exports for the CRM Ontology Extension

// Application Layer
export * from './application/services/contact.service';
export * from './application/services/email-ingestion.service';
export * from './application/services/email-processing.service';
export * from './application/services/extensible-entity-extraction.service';
export * from './application/services/spacy-entity-extraction.service';
export * from './application/use-cases/contact/create-contact.use-case';
export * from './application/use-cases/contact/get-contact.use-case';

// Domain Layer
export * from './ontology/o-cream-v2';
export * from './repositories/communication-repository';
export * from './repositories/contact-repository';

// Infrastructure Layer
export * from './infrastructure/repositories/neo4j-communication-repository';
export * from './infrastructure/repositories/neo4j-ocream-contact-repository';

// Registration
export { registerCrm } from './register'; 