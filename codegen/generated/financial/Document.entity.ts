import { BaseEntity } from '@shared/types/base-entity';

export interface Document extends BaseEntity {
}

export class DocumentEntity implements Document {

  constructor(data: Partial<Document>) {
    Object.assign(this, data);
  }



} 