import { BaseEntity } from '@shared/types/base-entity';

export interface Email extends BaseEntity {
}

export class EmailEntity implements Email {

  constructor(data: Partial<Email>) {
    Object.assign(this, data);
  }



} 