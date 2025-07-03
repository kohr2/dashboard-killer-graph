/**
 * IDocumentRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Document } from './Document.entity';

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  create(entity: Document): Promise<Document>;
  update(id: string, entity: Partial<Document>): Promise<Document>;
  delete(id: string): Promise<void>;
}

export abstract class BaseDocumentRepository implements IDocumentRepository {
  abstract findById(id: string): Promise<Document | null>;
  abstract findAll(): Promise<Document[]>;
  abstract create(entity: Document): Promise<Document>;
  abstract update(id: string, entity: Partial<Document>): Promise<Document>;
  abstract delete(id: string): Promise<void>;
  

} 