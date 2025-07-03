/**
 * IOrganizationRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Organization } from './Organization.entity';

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  create(entity: Organization): Promise<Organization>;
  update(id: string, entity: Partial<Organization>): Promise<Organization>;
  delete(id: string): Promise<void>;
  findBylegalNameAndindustry(legalName: string, industry: string): Promise<Organization | null>;
  findSimilar(entity: Organization, limit?: number): Promise<Organization[]>;
}

export abstract class BaseOrganizationRepository implements IOrganizationRepository {
  abstract findById(id: string): Promise<Organization | null>;
  abstract findAll(): Promise<Organization[]>;
  abstract create(entity: Organization): Promise<Organization>;
  abstract update(id: string, entity: Partial<Organization>): Promise<Organization>;
  abstract delete(id: string): Promise<void>;
  
  async findBylegalNameAndindustry(legalName: string, industry: string): Promise<Organization | null> {
    const all = await this.findAll();
    return all.find(entity => entity.legalName === legalName && entity.industry === industry) || null;
  }

  async findSimilar(entity: Organization, limit: number = 10): Promise<Organization[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 