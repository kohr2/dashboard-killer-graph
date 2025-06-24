// CRM Core Exports
// Generic CRM functionality - foundation for all extensions

// Domain Layer
export * from './domain';

// Application Layer  
export * from './application';

// Infrastructure Layer
export * from './infrastructure';

// Interface Layer
export * from './interface';

// CRM Core API
export { ContactService } from './application/services/contact.service';
export { EmailIngestionService } from './application/services/email-ingestion.service';
export { EmailProcessingService } from './application/services/email-processing.service';
export { EntityExtractionService } from './application/services/entity-extraction.service';
export { SpacyEntityExtractionService } from './application/services/spacy-entity-extraction.service';
export { ExtensibleEntityExtractionService } from './application/services/extensible-entity-extraction.service';
export { CrmCore } from './crm-core'; 