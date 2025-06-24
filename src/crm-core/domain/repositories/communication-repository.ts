// Communication Repository Interface
// Defines the contract for communication data access operations

import { Communication, CommunicationType, CommunicationDirection, CommunicationStatus } from '../entities/communication';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface CommunicationRepository {
  // Core CRUD operations
  save(communication: Communication): Promise<Communication>;
  findById(id: string): Promise<Communication | undefined>;
  findAll(options?: PaginationOptions): Promise<Communication[]>;
  delete(id: string): Promise<boolean>;

  // Specialized queries
  findByContactId(contactId: string): Promise<Communication[]>;
  findByType(type: CommunicationType): Promise<Communication[]>;
  findByStatus(status: CommunicationStatus): Promise<Communication[]>;
  search(query: string): Promise<Communication[]>;

  // Repository state operations
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
} 