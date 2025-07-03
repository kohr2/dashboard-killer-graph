/**
 * IThingRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Thing } from './Thing.entity';

export interface IThingRepository {
  findById(id: string): Promise<Thing | null>;
  findAll(): Promise<Thing[]>;
  create(entity: Thing): Promise<Thing>;
  update(id: string, entity: Partial<Thing>): Promise<Thing>;
  delete(id: string): Promise<void>;
}

export abstract class BaseThingRepository implements IThingRepository {
  abstract findById(id: string): Promise<Thing | null>;
  abstract findAll(): Promise<Thing[]>;
  abstract create(entity: Thing): Promise<Thing>;
  abstract update(id: string, entity: Partial<Thing>): Promise<Thing>;
  abstract delete(id: string): Promise<void>;
  

} 