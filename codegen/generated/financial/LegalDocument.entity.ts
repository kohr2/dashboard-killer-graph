import { BaseEntity } from '@shared/types/base-entity';

export interface LegalDocument extends BaseEntity {
}

export class LegalDocumentEntity implements LegalDocument {

  constructor(data: Partial<LegalDocument>) {
    Object.assign(this, data);
  }



} 