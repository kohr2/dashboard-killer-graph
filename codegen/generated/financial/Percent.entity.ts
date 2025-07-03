import { BaseEntity } from '@shared/types/base-entity';

export interface Percent extends BaseEntity {
}

export class PercentEntity implements Percent {

  constructor(data: Partial<Percent>) {
    Object.assign(this, data);
  }



} 