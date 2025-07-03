/**
 * ILegalDocumentRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { LegalDocument } from './LegalDocument.entity';

export interface ILegalDocumentRepository {
  findById(id: string): Promise<LegalDocument | null>;
  findAll(): Promise<LegalDocument[]>;
  create(entity: LegalDocument): Promise<LegalDocument>;
  update(id: string, entity: Partial<LegalDocument>): Promise<LegalDocument>;
  delete(id: string): Promise<void>;
}

export abstract class BaseLegalDocumentRepository implements ILegalDocumentRepository {
  abstract findById(id: string): Promise<LegalDocument | null>;
  abstract findAll(): Promise<LegalDocument[]>;
  abstract create(entity: LegalDocument): Promise<LegalDocument>;
  abstract update(id: string, entity: Partial<LegalDocument>): Promise<LegalDocument>;
  abstract delete(id: string): Promise<void>;
  

} 