/**
 * IPersonRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Person } from './Person.entity';

export interface IPersonRepository {
  findById(id: string): Promise<Person | null>;
  findAll(): Promise<Person[]>;
  create(entity: Person): Promise<Person>;
  update(id: string, entity: Partial<Person>): Promise<Person>;
  delete(id: string): Promise<void>;
  findByemailAndtitle(email: string, title: string): Promise<Person | null>;
  findSimilar(entity: Person, limit?: number): Promise<Person[]>;
}

export abstract class BasePersonRepository implements IPersonRepository {
  abstract findById(id: string): Promise<Person | null>;
  abstract findAll(): Promise<Person[]>;
  abstract create(entity: Person): Promise<Person>;
  abstract update(id: string, entity: Partial<Person>): Promise<Person>;
  abstract delete(id: string): Promise<void>;
  
  async findByemailAndtitle(email: string, title: string): Promise<Person | null> {
    const all = await this.findAll();
    return all.find(entity => entity.email === email && entity.title === title) || null;
  }

  async findSimilar(entity: Person, limit: number = 10): Promise<Person[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 