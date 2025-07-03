/**
 * ITimeRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Time } from './Time.entity';

export interface ITimeRepository {
  findById(id: string): Promise<Time | null>;
  findAll(): Promise<Time[]>;
  create(entity: Time): Promise<Time>;
  update(id: string, entity: Partial<Time>): Promise<Time>;
  delete(id: string): Promise<void>;
}

export abstract class BaseTimeRepository implements ITimeRepository {
  abstract findById(id: string): Promise<Time | null>;
  abstract findAll(): Promise<Time[]>;
  abstract create(entity: Time): Promise<Time>;
  abstract update(id: string, entity: Partial<Time>): Promise<Time>;
  abstract delete(id: string): Promise<void>;
  

} 