// Domain exports
export * from './entities/contact';
export * from './entities/organization';
export * from './entities/communication';
export * from './entities/task';

// Repository interfaces - import specific types to avoid duplicates
export type { ContactRepository } from './repositories/contact-repository';
export type { OrganizationRepository } from './repositories/organization-repository';
export type { CommunicationRepository } from './repositories/communication-repository';
export type { TaskRepository } from './repositories/task-repository';

// Export PaginationOptions once from the first repository
export type { PaginationOptions } from './repositories/contact-repository'; 