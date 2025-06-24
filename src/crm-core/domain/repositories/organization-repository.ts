// Organization Repository Interface
// Defines the contract for organization data access operations

import { Organization, OrganizationSize } from '../entities/organization';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface OrganizationRepository {
  // Core CRUD operations
  save(organization: Organization): Promise<Organization>;
  findById(id: string): Promise<Organization | undefined>;
  findAll(options?: PaginationOptions): Promise<Organization[]>;
  delete(id: string): Promise<boolean>;

  // Specialized queries
  findByName(name: string): Promise<Organization | undefined>;
  findByWebsite(website: string): Promise<Organization | undefined>;
  findBySize(size: OrganizationSize): Promise<Organization[]>;
  search(query: string): Promise<Organization[]>;

  // Repository state operations
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
} 