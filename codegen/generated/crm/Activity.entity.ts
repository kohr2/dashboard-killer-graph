import { BaseEntity } from '@shared/types/base-entity';

export interface Activity extends BaseEntity {
}

export class ActivityEntity implements Activity {

  constructor(data: Partial<Activity>) {
    Object.assign(this, data);
  }



} 