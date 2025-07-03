import { BaseEntity } from '@shared/types/base-entity';

export interface Location extends BaseEntity {
}

export class LocationEntity implements Location {

  constructor(data: Partial<Location>) {
    Object.assign(this, data);
  }


  /**
   * Get vector representation for this entity
   */
  getVectorRepresentation(): string {
    return `${this.type}:${this.name}`;
  }

} 