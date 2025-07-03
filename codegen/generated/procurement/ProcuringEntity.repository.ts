/**
 * IProcuringEntityRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { ProcuringEntity } from './ProcuringEntity.entity';

export interface IProcuringEntityRepository {
  findById(id: string): Promise<ProcuringEntity | null>;
  findAll(): Promise<ProcuringEntity[]>;
  create(entity: ProcuringEntity): Promise<ProcuringEntity>;
  update(id: string, entity: Partial<ProcuringEntity>): Promise<ProcuringEntity>;
  delete(id: string): Promise<void>;
}

export abstract class BaseProcuringEntityRepository implements IProcuringEntityRepository {
  abstract findById(id: string): Promise<ProcuringEntity | null>;
  abstract findAll(): Promise<ProcuringEntity[]>;
  abstract create(entity: ProcuringEntity): Promise<ProcuringEntity>;
  abstract update(id: string, entity: Partial<ProcuringEntity>): Promise<ProcuringEntity>;
  abstract delete(id: string): Promise<void>;
  

} 