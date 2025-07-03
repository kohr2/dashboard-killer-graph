import { BaseEntity } from '@shared/types/base-entity';

export interface UnrecognizedEntity extends BaseEntity {
}

export class UnrecognizedEntityEntity implements UnrecognizedEntity {

  constructor(data: Partial<UnrecognizedEntity>) {
    Object.assign(this, data);
  }



} 