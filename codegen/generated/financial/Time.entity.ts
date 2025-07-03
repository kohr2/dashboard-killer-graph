import { BaseEntity } from '@shared/types/base-entity';

export interface Time extends BaseEntity {
}

export class TimeEntity implements Time {

  constructor(data: Partial<Time>) {
    Object.assign(this, data);
  }



} 