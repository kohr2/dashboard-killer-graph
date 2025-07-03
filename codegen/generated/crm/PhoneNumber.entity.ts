import { BaseEntity } from '@shared/types/base-entity';

export interface PhoneNumber extends BaseEntity {
}

export class PhoneNumberEntity implements PhoneNumber {

  constructor(data: Partial<PhoneNumber>) {
    Object.assign(this, data);
  }



} 