import { BaseEntity } from '@shared/types/base-entity';

export interface ContactPoint extends BaseEntity {
}

export class ContactPointEntity implements ContactPoint {

  constructor(data: Partial<ContactPoint>) {
    Object.assign(this, data);
  }



} 