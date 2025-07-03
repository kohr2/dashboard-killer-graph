import { BaseEntity } from '@shared/types/base-entity';

export interface Contract extends BaseEntity {
}

export class ContractEntity implements Contract {

  constructor(data: Partial<Contract>) {
    Object.assign(this, data);
  }



} 