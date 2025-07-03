import { BaseEntity } from '@shared/types/base-entity';

export interface MonetaryAmount extends BaseEntity {
}

export class MonetaryAmountEntity implements MonetaryAmount {

  constructor(data: Partial<MonetaryAmount>) {
    Object.assign(this, data);
  }



} 