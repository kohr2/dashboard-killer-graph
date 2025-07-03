import { BaseEntity } from '@shared/types/base-entity';

export interface RegulatoryInformation extends BaseEntity {
}

export class RegulatoryInformationEntity implements RegulatoryInformation {

  constructor(data: Partial<RegulatoryInformation>) {
    Object.assign(this, data);
  }



} 