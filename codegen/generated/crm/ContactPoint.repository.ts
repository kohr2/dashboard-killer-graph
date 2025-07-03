/**
 * IContactPointRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { ContactPoint } from './ContactPoint.entity';

export interface IContactPointRepository {
  findById(id: string): Promise<ContactPoint | null>;
  findAll(): Promise<ContactPoint[]>;
  create(entity: ContactPoint): Promise<ContactPoint>;
  update(id: string, entity: Partial<ContactPoint>): Promise<ContactPoint>;
  delete(id: string): Promise<void>;
}

export abstract class BaseContactPointRepository implements IContactPointRepository {
  abstract findById(id: string): Promise<ContactPoint | null>;
  abstract findAll(): Promise<ContactPoint[]>;
  abstract create(entity: ContactPoint): Promise<ContactPoint>;
  abstract update(id: string, entity: Partial<ContactPoint>): Promise<ContactPoint>;
  abstract delete(id: string): Promise<void>;
  

} 