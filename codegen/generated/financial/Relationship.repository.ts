/**
 * IRelationshipRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Relationship } from './Relationship.entity';

export interface IRelationshipRepository {
  findById(id: string): Promise<Relationship | null>;
  findAll(): Promise<Relationship[]>;
  create(entity: Relationship): Promise<Relationship>;
  update(id: string, entity: Partial<Relationship>): Promise<Relationship>;
  delete(id: string): Promise<void>;
}

export abstract class BaseRelationshipRepository implements IRelationshipRepository {
  abstract findById(id: string): Promise<Relationship | null>;
  abstract findAll(): Promise<Relationship[]>;
  abstract create(entity: Relationship): Promise<Relationship>;
  abstract update(id: string, entity: Partial<Relationship>): Promise<Relationship>;
  abstract delete(id: string): Promise<void>;
  

} 