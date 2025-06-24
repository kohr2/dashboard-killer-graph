// Organization Entity - CRM Core Domain
// This class represents an organization/company in the CRM system

// Simple UUID generator for testing purposes
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface OrganizationData {
  id?: string;
  name: string;
  industry?: string;
  size?: OrganizationSize;
  website?: string;
  description?: string;
}

// Valid organization sizes
const VALID_SIZES = ['Small', 'Medium', 'Large', 'Enterprise'] as const;
export type OrganizationSize = typeof VALID_SIZES[number];

export class Organization {
  private id: string;
  private name: string;
  private industry?: string;
  private size?: OrganizationSize;
  private website?: string;
  private description?: string;
  private contacts: Set<string>;
  private createdAt: Date;
  private updatedAt: Date;
  
  constructor(data: OrganizationData) {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Organization name is required');
    }
    
    // Validate optional fields if provided
    if (data.website) {
      this.validateWebsite(data.website);
    }
    
    if (data.size) {
      this.validateSize(data.size);
    }
    
    // Set properties
    this.id = data.id || generateUUID();
    this.name = data.name.trim();
    this.industry = data.industry?.trim();
    this.size = data.size;
    this.website = data.website;
    this.description = data.description?.trim();
    this.contacts = new Set();
    
    // Set timestamps
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }
  
  getId(): string {
    return this.id;
  }
  
  getName(): string {
    return this.name;
  }
  
  getIndustry(): string | undefined {
    return this.industry;
  }
  
  getSize(): OrganizationSize | undefined {
    return this.size;
  }
  
  getWebsite(): string | undefined {
    return this.website;
  }
  
  getDescription(): string | undefined {
    return this.description;
  }
  
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Organization name is required');
    }
    
    this.name = name.trim();
    this.updatedAt = new Date();
  }
  
  updateIndustry(industry: string): void {
    this.industry = industry.trim();
    this.updatedAt = new Date();
  }
  
  updateSize(size: OrganizationSize): void {
    this.validateSize(size);
    this.size = size;
    this.updatedAt = new Date();
  }
  
  updateWebsite(website: string): void {
    this.validateWebsite(website);
    this.website = website;
    this.updatedAt = new Date();
  }
  
  updateDescription(description: string): void {
    this.description = description.trim();
    this.updatedAt = new Date();
  }
  
  addContact(contactId: string): void {
    this.contacts.add(contactId);
    this.updatedAt = new Date();
  }
  
  removeContact(contactId: string): void {
    this.contacts.delete(contactId);
    this.updatedAt = new Date();
  }
  
  getContacts(): string[] {
    return Array.from(this.contacts);
  }
  
  getContactCount(): number {
    return this.contacts.size;
  }
  
  getCreatedAt(): Date {
    return this.createdAt;
  }
  
  getUpdatedAt(): Date {
    return this.updatedAt;
  }
  
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      industry: this.industry,
      size: this.size,
      website: this.website,
      description: this.description,
      contacts: Array.from(this.contacts),
      contactCount: this.contacts.size,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  private validateWebsite(website: string): void {
    const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
    if (!urlRegex.test(website)) {
      throw new Error('Invalid website URL format');
    }
  }
  
  private validateSize(size: OrganizationSize): void {
    if (!VALID_SIZES.includes(size)) {
      throw new Error('Invalid organization size');
    }
  }
} 