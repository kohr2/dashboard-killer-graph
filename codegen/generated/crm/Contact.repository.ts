/**
 * IContactRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Contact } from './Contact.entity';

export interface IContactRepository {
  findById(id: string): Promise<Contact | null>;
  findAll(): Promise<Contact[]>;
  create(entity: Contact): Promise<Contact>;
  update(id: string, entity: Partial<Contact>): Promise<Contact>;
  delete(id: string): Promise<void>;
  findByidAndemail(id: string, email: string): Promise<Contact | null>;
  findSimilar(entity: Contact, limit?: number): Promise<Contact[]>;
}

export abstract class BaseContactRepository implements IContactRepository {
  abstract findById(id: string): Promise<Contact | null>;
  abstract findAll(): Promise<Contact[]>;
  abstract create(entity: Contact): Promise<Contact>;
  abstract update(id: string, entity: Partial<Contact>): Promise<Contact>;
  abstract delete(id: string): Promise<void>;
  
  async findByidAndemail(id: string, email: string): Promise<Contact | null> {
    const all = await this.findAll();
    return all.find(entity => entity.id === id && entity.email === email) || null;
  }

  async findSimilar(entity: Contact, limit: number = 10): Promise<Contact[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 