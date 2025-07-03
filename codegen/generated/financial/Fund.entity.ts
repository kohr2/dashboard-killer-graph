import { BaseEntity } from '@shared/types/base-entity';

export interface Fund extends BaseEntity {
}

export class FundEntity implements Fund {

  constructor(data: Partial<Fund>) {
    Object.assign(this, data);
  }



} 