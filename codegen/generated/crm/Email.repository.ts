/**
 * IEmailRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Email } from './Email.entity';

export interface IEmailRepository {
  findById(id: string): Promise<Email | null>;
  findAll(): Promise<Email[]>;
  create(entity: Email): Promise<Email>;
  update(id: string, entity: Partial<Email>): Promise<Email>;
  delete(id: string): Promise<void>;
}

export abstract class BaseEmailRepository implements IEmailRepository {
  abstract findById(id: string): Promise<Email | null>;
  abstract findAll(): Promise<Email[]>;
  abstract create(entity: Email): Promise<Email>;
  abstract update(id: string, entity: Partial<Email>): Promise<Email>;
  abstract delete(id: string): Promise<void>;
  

} 