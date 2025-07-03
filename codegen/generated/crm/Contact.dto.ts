/**
 * ContactDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ContactDTO {
  id: string;
  type: string;
  label: string;
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
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isContactDTO(obj: any): obj is ContactDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.email === 'string' &&
         typeof obj.title === 'string' &&
         typeof obj.firstName === 'string' &&
         typeof obj.lastName === 'string' &&
         typeof obj.phone === 'string' &&
         typeof obj.description === 'string' &&
         typeof obj.organizationId === 'string' &&
         typeof obj.activities === 'any[]' &&
         typeof obj.knowledgeElements === 'any[]' &&
         typeof obj.validationStatus === 'string' &&
         typeof obj.createdAt === 'Date' &&
         typeof obj.updatedAt === 'Date' &&
         typeof obj.additionalEmails === 'any[]' &&
         typeof obj.address === 'Record<string, any>' &&
         typeof obj.preferences === 'Record<string, any>';
}

export function createContactDTO(data: Partial<ContactDTO>): ContactDTO {
  return {
    id: data.id || '',
    type: data.type || 'Contact',
    label: data.label || 'Contact',
    name: data.name || null,
    email: data.email || null,
    title: data.title || null,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    phone: data.phone || null,
    description: data.description || null,
    organizationId: data.organizationId || null,
    activities: data.activities || null,
    knowledgeElements: data.knowledgeElements || null,
    validationStatus: data.validationStatus || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    additionalEmails: data.additionalEmails || null,
    address: data.address || null,
    preferences: data.preferences || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 