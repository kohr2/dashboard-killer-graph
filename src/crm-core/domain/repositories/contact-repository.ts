// Contact Repository Interface
// Defines the contract for contact data access operations

import { Contact } from '../entities/contact';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ContactRepository {
  // Core CRUD operations
  save(contact: Contact): Promise<Contact>;
  findById(id: string): Promise<Contact | undefined>;
  findAll(options?: PaginationOptions): Promise<Contact[]>;
  delete(id: string): Promise<boolean>;

  // Specialized queries
  findByEmail(email: string): Promise<Contact | undefined>;
  findByOrganizationId(organizationId: string): Promise<Contact[]>;
  search(query: string): Promise<Contact[]>;

  // Repository state operations
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
} 