import { BaseEntity } from '@shared/types/base-entity';

export interface Event extends BaseEntity {
}

export class EventEntity implements Event {

  constructor(data: Partial<Event>) {
    Object.assign(this, data);
  }



} 