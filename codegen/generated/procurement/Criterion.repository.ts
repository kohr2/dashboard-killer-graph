/**
 * ICriterionRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Criterion } from './Criterion.entity';

export interface ICriterionRepository {
  findById(id: string): Promise<Criterion | null>;
  findAll(): Promise<Criterion[]>;
  create(entity: Criterion): Promise<Criterion>;
  update(id: string, entity: Partial<Criterion>): Promise<Criterion>;
  delete(id: string): Promise<void>;
}

export abstract class BaseCriterionRepository implements ICriterionRepository {
  abstract findById(id: string): Promise<Criterion | null>;
  abstract findAll(): Promise<Criterion[]>;
  abstract create(entity: Criterion): Promise<Criterion>;
  abstract update(id: string, entity: Partial<Criterion>): Promise<Criterion>;
  abstract delete(id: string): Promise<void>;
  

} 