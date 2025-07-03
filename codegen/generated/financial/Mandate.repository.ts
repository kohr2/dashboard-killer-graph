/**
 * IMandateRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Mandate } from './Mandate.entity';

export interface IMandateRepository {
  findById(id: string): Promise<Mandate | null>;
  findAll(): Promise<Mandate[]>;
  create(entity: Mandate): Promise<Mandate>;
  update(id: string, entity: Partial<Mandate>): Promise<Mandate>;
  delete(id: string): Promise<void>;
}

export abstract class BaseMandateRepository implements IMandateRepository {
  abstract findById(id: string): Promise<Mandate | null>;
  abstract findAll(): Promise<Mandate[]>;
  abstract create(entity: Mandate): Promise<Mandate>;
  abstract update(id: string, entity: Partial<Mandate>): Promise<Mandate>;
  abstract delete(id: string): Promise<void>;
  

} 