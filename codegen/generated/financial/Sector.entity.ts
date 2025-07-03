import { BaseEntity } from '@shared/types/base-entity';

export interface Sector extends BaseEntity {
}

export class SectorEntity implements Sector {

  constructor(data: Partial<Sector>) {
    Object.assign(this, data);
  }


  /**
   * Get vector representation for this entity
   */
  getVectorRepresentation(): string {
    return `${this.type}:${this.name}`;
  }

} 