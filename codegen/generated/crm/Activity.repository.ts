/**
 * IActivityRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Activity } from './Activity.entity';

export interface IActivityRepository {
  findById(id: string): Promise<Activity | null>;
  findAll(): Promise<Activity[]>;
  create(entity: Activity): Promise<Activity>;
  update(id: string, entity: Partial<Activity>): Promise<Activity>;
  delete(id: string): Promise<void>;
}

export abstract class BaseActivityRepository implements IActivityRepository {
  abstract findById(id: string): Promise<Activity | null>;
  abstract findAll(): Promise<Activity[]>;
  abstract create(entity: Activity): Promise<Activity>;
  abstract update(id: string, entity: Partial<Activity>): Promise<Activity>;
  abstract delete(id: string): Promise<void>;
  

} 