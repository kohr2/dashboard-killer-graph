import { BaseEntity } from '@shared/types/base-entity';

export interface Mandate extends BaseEntity {
}

export class MandateEntity implements Mandate {

  constructor(data: Partial<Mandate>) {
    Object.assign(this, data);
  }



} 