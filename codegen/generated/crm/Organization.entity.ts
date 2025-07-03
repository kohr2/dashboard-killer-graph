import { BaseEntity } from '@shared/types/base-entity';

export interface Organization extends BaseEntity {
  name: string;
  legalName: string;
  industry: string;
  website: string;
  description: string;
  size: string;
  foundedYear: string;
  headquarters: Record<string, any>;
  address: Record<string, any>;
  phone: string;
  email: string;
  parentOrganizationId: string;
  activities: any[];
  knowledgeElements: any[];
  validationStatus: string;
  preferences: Record<string, any>;
}

export class OrganizationEntity implements Organization {
  name!: string;
  legalName!: string;
  industry!: string;
  website!: string;
  description!: string;
  size!: string;
  foundedYear!: string;
  headquarters!: Record<string, any>;
  address!: Record<string, any>;
  phone!: string;
  email!: string;
  parentOrganizationId!: string;
  activities!: any[];
  knowledgeElements!: any[];
  validationStatus!: string;
  preferences!: Record<string, any>;

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