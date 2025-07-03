/**
 * IProcessRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Process } from './Process.entity';

export interface IProcessRepository {
  findById(id: string): Promise<Process | null>;
  findAll(): Promise<Process[]>;
  create(entity: Process): Promise<Process>;
  update(id: string, entity: Partial<Process>): Promise<Process>;
  delete(id: string): Promise<void>;
}

export abstract class BaseProcessRepository implements IProcessRepository {
  abstract findById(id: string): Promise<Process | null>;
  abstract findAll(): Promise<Process[]>;
  abstract create(entity: Process): Promise<Process>;
  abstract update(id: string, entity: Partial<Process>): Promise<Process>;
  abstract delete(id: string): Promise<void>;
  

} 