import { BaseEntity } from '@shared/types/base-entity';

export interface EconomicOperator extends BaseEntity {
}

export class EconomicOperatorEntity implements EconomicOperator {

  constructor(data: Partial<EconomicOperator>) {
    Object.assign(this, data);
  }



} 