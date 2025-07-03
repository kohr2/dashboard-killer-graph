/**
 * IUnrecognizedEntityRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { UnrecognizedEntity } from './UnrecognizedEntity.entity';

export interface IUnrecognizedEntityRepository {
  findById(id: string): Promise<UnrecognizedEntity | null>;
  findAll(): Promise<UnrecognizedEntity[]>;
  create(entity: UnrecognizedEntity): Promise<UnrecognizedEntity>;
  update(id: string, entity: Partial<UnrecognizedEntity>): Promise<UnrecognizedEntity>;
  delete(id: string): Promise<void>;
}

export abstract class BaseUnrecognizedEntityRepository implements IUnrecognizedEntityRepository {
  abstract findById(id: string): Promise<UnrecognizedEntity | null>;
  abstract findAll(): Promise<UnrecognizedEntity[]>;
  abstract create(entity: UnrecognizedEntity): Promise<UnrecognizedEntity>;
  abstract update(id: string, entity: Partial<UnrecognizedEntity>): Promise<UnrecognizedEntity>;
  abstract delete(id: string): Promise<void>;
  

} 