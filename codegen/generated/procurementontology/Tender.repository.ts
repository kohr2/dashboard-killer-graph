/**
 * ITenderRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Tender } from './Tender.entity';

export interface ITenderRepository {
  findById(id: string): Promise<Tender | null>;
  findAll(): Promise<Tender[]>;
  create(entity: Tender): Promise<Tender>;
  update(id: string, entity: Partial<Tender>): Promise<Tender>;
  delete(id: string): Promise<void>;
}

export abstract class BaseTenderRepository implements ITenderRepository {
  abstract findById(id: string): Promise<Tender | null>;
  abstract findAll(): Promise<Tender[]>;
  abstract create(entity: Tender): Promise<Tender>;
  abstract update(id: string, entity: Partial<Tender>): Promise<Tender>;
  abstract delete(id: string): Promise<void>;
  

} 