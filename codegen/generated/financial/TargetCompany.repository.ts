/**
 * ITargetCompanyRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { TargetCompany } from './TargetCompany.entity';

export interface ITargetCompanyRepository {
  findById(id: string): Promise<TargetCompany | null>;
  findAll(): Promise<TargetCompany[]>;
  create(entity: TargetCompany): Promise<TargetCompany>;
  update(id: string, entity: Partial<TargetCompany>): Promise<TargetCompany>;
  delete(id: string): Promise<void>;
  findByindustryAndwebsite(industry: string, website: string): Promise<TargetCompany | null>;
  findSimilar(entity: TargetCompany, limit?: number): Promise<TargetCompany[]>;
}

export abstract class BaseTargetCompanyRepository implements ITargetCompanyRepository {
  abstract findById(id: string): Promise<TargetCompany | null>;
  abstract findAll(): Promise<TargetCompany[]>;
  abstract create(entity: TargetCompany): Promise<TargetCompany>;
  abstract update(id: string, entity: Partial<TargetCompany>): Promise<TargetCompany>;
  abstract delete(id: string): Promise<void>;
  
  async findByindustryAndwebsite(industry: string, website: string): Promise<TargetCompany | null> {
    const all = await this.findAll();
    return all.find(entity => entity.industry === industry && entity.website === website) || null;
  }

  async findSimilar(entity: TargetCompany, limit: number = 10): Promise<TargetCompany[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 