// In-Memory Organization Repository Implementation
// Provides in-memory storage for testing and development

import { Organization, OrganizationSize } from '../../domain/entities/organization';
import { OrganizationRepository, PaginationOptions } from '../../domain/repositories/organization-repository';

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private organizations: Map<string, Organization> = new Map();

  async save(organization: Organization): Promise<Organization> {
    this.organizations.set(organization.getId(), organization);
    return organization;
  }

  async findById(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async findAll(options?: PaginationOptions): Promise<Organization[]> {
    const allOrganizations = Array.from(this.organizations.values());
    
    if (!options) {
      return allOrganizations;
    }

    const { page, limit } = options;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return allOrganizations.slice(startIndex, endIndex);
  }

  async delete(id: string): Promise<boolean> {
    return this.organizations.delete(id);
  }

  async findByName(name: string): Promise<Organization | undefined> {
    for (const organization of this.organizations.values()) {
      if (organization.getName() === name) {
        return organization;
      }
    }
    return undefined;
  }

  async findByWebsite(website: string): Promise<Organization | undefined> {
    for (const organization of this.organizations.values()) {
      if (organization.getWebsite() === website) {
        return organization;
      }
    }
    return undefined;
  }

  async findBySize(size: OrganizationSize): Promise<Organization[]> {
    const results: Organization[] = [];

    for (const organization of this.organizations.values()) {
      if (organization.getSize() === size) {
        results.push(organization);
      }
    }

    return results;
  }

  async search(query: string): Promise<Organization[]> {
    const searchTerm = query.toLowerCase();
    const results: Organization[] = [];

    for (const organization of this.organizations.values()) {
      const name = organization.getName().toLowerCase();
      const website = organization.getWebsite()?.toLowerCase() || '';
      
      if (name.includes(searchTerm) || website.includes(searchTerm)) {
        results.push(organization);
      }
    }

    return results;
  }

  async count(): Promise<number> {
    return this.organizations.size;
  }

  async exists(id: string): Promise<boolean> {
    return this.organizations.has(id);
  }
} 