/**
 * ILotRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Lot } from './Lot.entity';

export interface ILotRepository {
  findById(id: string): Promise<Lot | null>;
  findAll(): Promise<Lot[]>;
  create(entity: Lot): Promise<Lot>;
  update(id: string, entity: Partial<Lot>): Promise<Lot>;
  delete(id: string): Promise<void>;
}

export abstract class BaseLotRepository implements ILotRepository {
  abstract findById(id: string): Promise<Lot | null>;
  abstract findAll(): Promise<Lot[]>;
  abstract create(entity: Lot): Promise<Lot>;
  abstract update(id: string, entity: Partial<Lot>): Promise<Lot>;
  abstract delete(id: string): Promise<void>;
  

} 