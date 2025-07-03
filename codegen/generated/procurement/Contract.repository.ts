/**
 * IContractRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Contract } from './Contract.entity';

export interface IContractRepository {
  findById(id: string): Promise<Contract | null>;
  findAll(): Promise<Contract[]>;
  create(entity: Contract): Promise<Contract>;
  update(id: string, entity: Partial<Contract>): Promise<Contract>;
  delete(id: string): Promise<void>;
}

export abstract class BaseContractRepository implements IContractRepository {
  abstract findById(id: string): Promise<Contract | null>;
  abstract findAll(): Promise<Contract[]>;
  abstract create(entity: Contract): Promise<Contract>;
  abstract update(id: string, entity: Partial<Contract>): Promise<Contract>;
  abstract delete(id: string): Promise<void>;
  

} 