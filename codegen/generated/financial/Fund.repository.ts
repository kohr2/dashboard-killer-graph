/**
 * IFundRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Fund } from './Fund.entity';

export interface IFundRepository {
  findById(id: string): Promise<Fund | null>;
  findAll(): Promise<Fund[]>;
  create(entity: Fund): Promise<Fund>;
  update(id: string, entity: Partial<Fund>): Promise<Fund>;
  delete(id: string): Promise<void>;
}

export abstract class BaseFundRepository implements IFundRepository {
  abstract findById(id: string): Promise<Fund | null>;
  abstract findAll(): Promise<Fund[]>;
  abstract create(entity: Fund): Promise<Fund>;
  abstract update(id: string, entity: Partial<Fund>): Promise<Fund>;
  abstract delete(id: string): Promise<void>;
  

} 