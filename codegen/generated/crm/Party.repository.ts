/**
 * IPartyRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Party } from './Party.entity';

export interface IPartyRepository {
  findById(id: string): Promise<Party | null>;
  findAll(): Promise<Party[]>;
  create(entity: Party): Promise<Party>;
  update(id: string, entity: Partial<Party>): Promise<Party>;
  delete(id: string): Promise<void>;
}

export abstract class BasePartyRepository implements IPartyRepository {
  abstract findById(id: string): Promise<Party | null>;
  abstract findAll(): Promise<Party[]>;
  abstract create(entity: Party): Promise<Party>;
  abstract update(id: string, entity: Partial<Party>): Promise<Party>;
  abstract delete(id: string): Promise<void>;
  

} 