/**
 * ILocationRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Location } from './Location.entity';

export interface ILocationRepository {
  findById(id: string): Promise<Location | null>;
  findAll(): Promise<Location[]>;
  create(entity: Location): Promise<Location>;
  update(id: string, entity: Partial<Location>): Promise<Location>;
  delete(id: string): Promise<void>;
  findSimilar(entity: Location, limit?: number): Promise<Location[]>;
}

export abstract class BaseLocationRepository implements ILocationRepository {
  abstract findById(id: string): Promise<Location | null>;
  abstract findAll(): Promise<Location[]>;
  abstract create(entity: Location): Promise<Location>;
  abstract update(id: string, entity: Partial<Location>): Promise<Location>;
  abstract delete(id: string): Promise<void>;
  

  async findSimilar(entity: Location, limit: number = 10): Promise<Location[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 