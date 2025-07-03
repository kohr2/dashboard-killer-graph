import { BaseEntity } from '@shared/types/base-entity';

export interface Thing extends BaseEntity {
}

export class ThingEntity implements Thing {

  constructor(data: Partial<Thing>) {
    Object.assign(this, data);
  }



} 