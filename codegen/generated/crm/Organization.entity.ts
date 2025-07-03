import { BaseEntity } from '@shared/types/base-entity';

export interface Organization extends BaseEntity {
  name: string;
  legalName: string;
  industry: string;
  website: string;
  description: string;
  size: string;
  foundedYear: string;
  headquarters: Record&lt;string, any&gt;;
  address: Record&lt;string, any&gt;;
  phone: string;
  email: string;
  parentOrganizationId: string;
  activities: any[];
  knowledgeElements: any[];
  validationStatus: string;
  createdAt: Date;
  updatedAt: Date;
  enrichedData: Record&lt;string, any&gt;;
  preferences: Record&lt;string, any&gt;;
}

export class OrganizationEntity implements Organization {
  name!: string;
  legalName!: string;
  industry!: string;
  website!: string;
  description!: string;
  size!: string;
  foundedYear!: string;
  headquarters!: Record&lt;string, any&gt;;
  address!: Record&lt;string, any&gt;;
  phone!: string;
  email!: string;
  parentOrganizationId!: string;
  activities!: any[];
  knowledgeElements!: any[];
  validationStatus!: string;
  createdAt!: Date;
  updatedAt!: Date;
  enrichedData!: Record&lt;string, any&gt;;
  preferences!: Record&lt;string, any&gt;;

  constructor(data: Partial<Organization>) {
    Object.assign(this, data);
  }

  /**
   * Get key properties for this entity
   */
  getKeyProperties(): Record<string, any> {
    return {
      legalName: this.legalName,
      industry: this.industry,
    };
  }

  /**
   * Get vector representation for this entity
   */
  getVectorRepresentation(): string {
    return `${this.type}:${this.name}`;
  }

  /**
   * Get enrichment configuration for this entity
   */
  getEnrichmentConfig() {
    return {
      service: 'EDGAR',
      properties: ['name', 'website']
    };
  }
} 