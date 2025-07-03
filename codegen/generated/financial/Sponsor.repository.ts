/**
 * ISponsorRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Sponsor } from './Sponsor.entity';

export interface ISponsorRepository {
  findById(id: string): Promise<Sponsor | null>;
  findAll(): Promise<Sponsor[]>;
  create(entity: Sponsor): Promise<Sponsor>;
  update(id: string, entity: Partial<Sponsor>): Promise<Sponsor>;
  delete(id: string): Promise<void>;
}

export abstract class BaseSponsorRepository implements ISponsorRepository {
  abstract findById(id: string): Promise<Sponsor | null>;
  abstract findAll(): Promise<Sponsor[]>;
  abstract create(entity: Sponsor): Promise<Sponsor>;
  abstract update(id: string, entity: Partial<Sponsor>): Promise<Sponsor>;
  abstract delete(id: string): Promise<void>;
  

} 