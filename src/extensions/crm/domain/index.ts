// Domain exports
export * from './entities/communication';
export * from './entities/contact-ontology';
export * from './entities/activity-type';
export * from './entities/dolce-category';
export * from './entities/knowledge-type';
export * from './entities/relationship-type';
export * from './entities/software-type';

// Repository interfaces
export type {
  CommunicationRepository,
  PaginationOptions,
} from './repositories/communication-repository';
export type { ContactRepository } from './repositories/contact-repository'; 