import { BaseEntity } from '@shared/types/base-entity';

export interface Party extends BaseEntity {
}

export class PartyEntity implements Party {

  constructor(data: Partial<Party>) {
    Object.assign(this, data);
  }



} 