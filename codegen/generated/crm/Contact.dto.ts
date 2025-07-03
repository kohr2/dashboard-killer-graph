/**
 * ContactDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ContactDTO {
  id: string;
  type: string;
  label: string;
  name: ;
  email: ;
  title: ;
  firstName: ;
  lastName: ;
  phone: ;
  description: ;
  organizationId: ;
  activities: ;
  knowledgeElements: ;
  validationStatus: ;
  createdAt: ;
  updatedAt: ;
  additionalEmails: ;
  address: ;
  preferences: ;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isContactDTO(obj: any): obj is ContactDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.name === '' &&
         typeof obj.email === '' &&
         typeof obj.title === '' &&
         typeof obj.firstName === '' &&
         typeof obj.lastName === '' &&
         typeof obj.phone === '' &&
         typeof obj.description === '' &&
         typeof obj.organizationId === '' &&
         typeof obj.activities === '' &&
         typeof obj.knowledgeElements === '' &&
         typeof obj.validationStatus === '' &&
         typeof obj.createdAt === '' &&
         typeof obj.updatedAt === '' &&
         typeof obj.additionalEmails === '' &&
         typeof obj.address === '' &&
         typeof obj.preferences === '';
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