import { BaseEntity } from '@shared/types/base-entity';

export interface Sponsor extends BaseEntity {
}

export class SponsorEntity implements Sponsor {

  constructor(data: Partial<Sponsor>) {
    Object.assign(this, data);
  }



} 