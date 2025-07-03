import { BaseEntity } from '@shared/types/base-entity';

export interface Date extends BaseEntity {
}

export class DateEntity implements Date {

  constructor(data: Partial<Date>) {
    Object.assign(this, data);
  }



} 