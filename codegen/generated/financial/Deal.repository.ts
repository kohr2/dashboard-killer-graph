/**
 * IDealRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Deal } from './Deal.entity';

export interface IDealRepository {
  findById(id: string): Promise<Deal | null>;
  findAll(): Promise<Deal[]>;
  create(entity: Deal): Promise<Deal>;
  update(id: string, entity: Partial<Deal>): Promise<Deal>;
  delete(id: string): Promise<void>;
  findBydealTypeAndsectorAndpurpose(dealType: string, sector: string, purpose: string): Promise<Deal | null>;
  findSimilar(entity: Deal, limit?: number): Promise<Deal[]>;
}

export abstract class BaseDealRepository implements IDealRepository {
  abstract findById(id: string): Promise<Deal | null>;
  abstract findAll(): Promise<Deal[]>;
  abstract create(entity: Deal): Promise<Deal>;
  abstract update(id: string, entity: Partial<Deal>): Promise<Deal>;
  abstract delete(id: string): Promise<void>;
  
  async findBydealTypeAndsectorAndpurpose(dealType: string, sector: string, purpose: string): Promise<Deal | null> {
    const all = await this.findAll();
    return all.find(entity => entity.dealType === dealType && entity.sector === sector && entity.purpose === purpose) || null;
  }

  async findSimilar(entity: Deal, limit: number = 10): Promise<Deal[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 