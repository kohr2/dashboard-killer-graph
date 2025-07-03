import { BaseEntity } from '@shared/types/base-entity';

export interface GeographicRegion extends BaseEntity {
}

export class GeographicRegionEntity implements GeographicRegion {

  constructor(data: Partial<GeographicRegion>) {
    Object.assign(this, data);
  }

  /**
   * Get key properties for this entity
   */
  getKeyProperties(): Record<string, any> {
    return {
      country: this.country,
    };
  }


} 