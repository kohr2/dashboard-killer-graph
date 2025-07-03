/**
 * IGeographicRegionRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { GeographicRegion } from './GeographicRegion.entity';

export interface IGeographicRegionRepository {
  findById(id: string): Promise<GeographicRegion | null>;
  findAll(): Promise<GeographicRegion[]>;
  create(entity: GeographicRegion): Promise<GeographicRegion>;
  update(id: string, entity: Partial<GeographicRegion>): Promise<GeographicRegion>;
  delete(id: string): Promise<void>;
  findBycountry(country: string): Promise<GeographicRegion | null>;
}

export abstract class BaseGeographicRegionRepository implements IGeographicRegionRepository {
  abstract findById(id: string): Promise<GeographicRegion | null>;
  abstract findAll(): Promise<GeographicRegion[]>;
  abstract create(entity: GeographicRegion): Promise<GeographicRegion>;
  abstract update(id: string, entity: Partial<GeographicRegion>): Promise<GeographicRegion>;
  abstract delete(id: string): Promise<void>;
  
  async findBycountry(country: string): Promise<GeographicRegion | null> {
    const all = await this.findAll();
    return all.find(entity => entity.country === country) || null;
  }

} 