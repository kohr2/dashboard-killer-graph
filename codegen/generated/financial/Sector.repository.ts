/**
 * ISectorRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Sector } from './Sector.entity';

export interface ISectorRepository {
  findById(id: string): Promise<Sector | null>;
  findAll(): Promise<Sector[]>;
  create(entity: Sector): Promise<Sector>;
  update(id: string, entity: Partial<Sector>): Promise<Sector>;
  delete(id: string): Promise<void>;
  findSimilar(entity: Sector, limit?: number): Promise<Sector[]>;
}

export abstract class BaseSectorRepository implements ISectorRepository {
  abstract findById(id: string): Promise<Sector | null>;
  abstract findAll(): Promise<Sector[]>;
  abstract create(entity: Sector): Promise<Sector>;
  abstract update(id: string, entity: Partial<Sector>): Promise<Sector>;
  abstract delete(id: string): Promise<void>;
  

  async findSimilar(entity: Sector, limit: number = 10): Promise<Sector[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 