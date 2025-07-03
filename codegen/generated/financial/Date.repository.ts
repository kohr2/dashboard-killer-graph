/**
 * IDateRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Date } from './Date.entity';

export interface IDateRepository {
  findById(id: string): Promise<Date | null>;
  findAll(): Promise<Date[]>;
  create(entity: Date): Promise<Date>;
  update(id: string, entity: Partial<Date>): Promise<Date>;
  delete(id: string): Promise<void>;
}

export abstract class BaseDateRepository implements IDateRepository {
  abstract findById(id: string): Promise<Date | null>;
  abstract findAll(): Promise<Date[]>;
  abstract create(entity: Date): Promise<Date>;
  abstract update(id: string, entity: Partial<Date>): Promise<Date>;
  abstract delete(id: string): Promise<void>;
  

} 