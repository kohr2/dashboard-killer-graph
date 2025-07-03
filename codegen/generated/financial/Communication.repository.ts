/**
 * ICommunicationRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Communication } from './Communication.entity';

export interface ICommunicationRepository {
  findById(id: string): Promise<Communication | null>;
  findAll(): Promise<Communication[]>;
  create(entity: Communication): Promise<Communication>;
  update(id: string, entity: Partial<Communication>): Promise<Communication>;
  delete(id: string): Promise<void>;
}

export abstract class BaseCommunicationRepository implements ICommunicationRepository {
  abstract findById(id: string): Promise<Communication | null>;
  abstract findAll(): Promise<Communication[]>;
  abstract create(entity: Communication): Promise<Communication>;
  abstract update(id: string, entity: Partial<Communication>): Promise<Communication>;
  abstract delete(id: string): Promise<void>;
  

} 