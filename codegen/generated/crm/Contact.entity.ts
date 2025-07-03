import { BaseEntity } from '@shared/types/base-entity';

export interface Contact extends BaseEntity {
  name: string;
  email: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  description: string;
  organizationId: string;
  activities: any[];
  knowledgeElements: any[];
  validationStatus: string;
  createdAt: Date;
  updatedAt: Date;
  additionalEmails: any[];
  address: Record<string, any>;
  preferences: Record<string, any>;
}

export class ContactEntity implements Contact {
  name!: string;
  email!: string;
  title!: string;
  firstName!: string;
  lastName!: string;
  phone!: string;
  description!: string;
  organizationId!: string;
  activities!: any[];
  knowledgeElements!: any[];
  validationStatus!: string;
  createdAt!: Date;
  updatedAt!: Date;
  additionalEmails!: any[];
  address!: Record<string, any>;
  preferences!: Record<string, any>;

  constructor(data: Partial<Contact>) {
    Object.assign(this, data);
  }

  /**
   * Get key properties for this entity
   */
  getKeyProperties(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
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
      service: 'contact-enrichment',
      properties: ['email', 'name']
    };
  }
} 