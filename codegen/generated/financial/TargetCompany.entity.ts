import { BaseEntity } from '@shared/types/base-entity';

export interface TargetCompany extends BaseEntity {
}

export class TargetCompanyEntity implements TargetCompany {

  constructor(data: Partial<TargetCompany>) {
    Object.assign(this, data);
  }

  /**
   * Get key properties for this entity
   */
  getKeyProperties(): Record<string, any> {
    return {
      industry: this.industry,
      website: this.website,
    };
  }

  /**
   * Get vector representation for this entity
   */
  getVectorRepresentation(): string {
    return `${this.type}:${this.name}`;
  }

} 