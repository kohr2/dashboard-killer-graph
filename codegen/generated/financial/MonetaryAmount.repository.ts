/**
 * IMonetaryAmountRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { MonetaryAmount } from './MonetaryAmount.entity';

export interface IMonetaryAmountRepository {
  findById(id: string): Promise<MonetaryAmount | null>;
  findAll(): Promise<MonetaryAmount[]>;
  create(entity: MonetaryAmount): Promise<MonetaryAmount>;
  update(id: string, entity: Partial<MonetaryAmount>): Promise<MonetaryAmount>;
  delete(id: string): Promise<void>;
}

export abstract class BaseMonetaryAmountRepository implements IMonetaryAmountRepository {
  abstract findById(id: string): Promise<MonetaryAmount | null>;
  abstract findAll(): Promise<MonetaryAmount[]>;
  abstract create(entity: MonetaryAmount): Promise<MonetaryAmount>;
  abstract update(id: string, entity: Partial<MonetaryAmount>): Promise<MonetaryAmount>;
  abstract delete(id: string): Promise<void>;
  

} 