/**
 * OrganizationDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface OrganizationDTO {
  id: string;
  type: string;
  label: string;
  name?: string;
  legalName?: string;
  industry?: string;
  website?: string;
  description?: string;
  size?: string;
  foundedYear?: string;
  headquarters?: Record<string, any>;
  address?: Record<string, any>;
  phone?: string;
  email?: string;
  parentOrganizationId?: string;
  activities?: any[];
  knowledgeElements?: any[];
  validationStatus?: string;
  preferences?: Record<string, any>;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isOrganizationDTO(obj: any): obj is OrganizationDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createOrganizationDTO(data: Partial<OrganizationDTO>): OrganizationDTO {
  return {
    id: data.id || '',
    type: data.type || 'Organization',
    label: data.label || 'Organization',
    name: data.name,
    legalName: data.legalName,
    industry: data.industry,
    website: data.website,
    description: data.description,
    size: data.size,
    foundedYear: data.foundedYear,
    headquarters: data.headquarters,
    address: data.address,
    phone: data.phone,
    email: data.email,
    parentOrganizationId: data.parentOrganizationId,
    activities: data.activities,
    knowledgeElements: data.knowledgeElements,
    validationStatus: data.validationStatus,
    preferences: data.preferences,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 