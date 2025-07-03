import { BaseEntity } from '@shared/types/base-entity';

export interface Relationship extends BaseEntity {
}

export class RelationshipEntity implements Relationship {

  constructor(data: Partial<Relationship>) {
    Object.assign(this, data);
  }



} 