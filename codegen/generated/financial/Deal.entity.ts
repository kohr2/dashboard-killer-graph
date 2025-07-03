import { BaseEntity } from '@shared/types/base-entity';

export interface Deal extends BaseEntity {
  dealSize: number;
  sector: string;
  dealType: string;
  purpose: string;
  status: string;
}

export class DealEntity implements Deal {
  dealSize!: number;
  sector!: string;
  dealType!: string;
  purpose!: string;
  status!: string;

  constructor(data: Partial<Deal>) {
    Object.assign(this, data);
  }

  /**
   * Get key properties for this entity
   */
  getKeyProperties(): Record<string, any> {
    return {
      dealType: this.dealType,
      sector: this.sector,
      purpose: this.purpose,
    };
  }

  /**
   * Get vector representation for this entity
   */
  getVectorRepresentation(): string {
    return `${this.type}:${this.name}`;
  }

} 