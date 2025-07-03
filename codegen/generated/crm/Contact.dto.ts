/**
 * ContactDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ContactDTO {
  id: string;
  type: string;
  label: string;
  name?: string;
  email?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  description?: string;
  organizationId?: string;
  activities?: any[];
  knowledgeElements?: any[];
  validationStatus?: string;
  additionalEmails?: any[];
  address?: Record<string, any>;
  preferences?: Record<string, any>;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isContactDTO(obj: any): obj is ContactDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createContactDTO(data: Partial<ContactDTO>): ContactDTO {
  return {
    id: data.id || '',
    type: data.type || 'Contact',
    label: data.label || 'Contact',
    name: data.name,
    email: data.email,
    title: data.title,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    description: data.description,
    organizationId: data.organizationId,
    activities: data.activities,
    knowledgeElements: data.knowledgeElements,
    validationStatus: data.validationStatus,
    additionalEmails: data.additionalEmails,
    address: data.address,
    preferences: data.preferences,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 