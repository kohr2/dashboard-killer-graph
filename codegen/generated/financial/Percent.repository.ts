/**
 * IPercentRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Percent } from './Percent.entity';

export interface IPercentRepository {
  findById(id: string): Promise<Percent | null>;
  findAll(): Promise<Percent[]>;
  create(entity: Percent): Promise<Percent>;
  update(id: string, entity: Partial<Percent>): Promise<Percent>;
  delete(id: string): Promise<void>;
}

export abstract class BasePercentRepository implements IPercentRepository {
  abstract findById(id: string): Promise<Percent | null>;
  abstract findAll(): Promise<Percent[]>;
  abstract create(entity: Percent): Promise<Percent>;
  abstract update(id: string, entity: Partial<Percent>): Promise<Percent>;
  abstract delete(id: string): Promise<void>;
  

} 