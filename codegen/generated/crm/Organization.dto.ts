/**
 * OrganizationDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface OrganizationDTO {
  id: string;
  type: string;
  label: string;
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
  createdAt: Date;
  updatedAt: Date;
  enrichedData: Record<string, any>;
  preferences: Record<string, any>;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isOrganizationDTO(obj: any): obj is OrganizationDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.legalName === 'string' &&
         typeof obj.industry === 'string' &&
         typeof obj.website === 'string' &&
         typeof obj.description === 'string' &&
         typeof obj.size === 'string' &&
         typeof obj.foundedYear === 'string' &&
         typeof obj.headquarters === 'Record<string, any>' &&
         typeof obj.address === 'Record<string, any>' &&
         typeof obj.phone === 'string' &&
         typeof obj.email === 'string' &&
         typeof obj.parentOrganizationId === 'string' &&
         typeof obj.activities === 'any[]' &&
         typeof obj.knowledgeElements === 'any[]' &&
         typeof obj.validationStatus === 'string' &&
         typeof obj.createdAt === 'Date' &&
         typeof obj.updatedAt === 'Date' &&
         typeof obj.enrichedData === 'Record<string, any>' &&
         typeof obj.preferences === 'Record<string, any>';
}

export function createOrganizationDTO(data: Partial<OrganizationDTO>): OrganizationDTO {
  return {
    id: data.id || '',
    type: data.type || 'Organization',
    label: data.label || 'Organization',
    name: data.name || null,
    legalName: data.legalName || null,
    industry: data.industry || null,
    website: data.website || null,
    description: data.description || null,
    size: data.size || null,
    foundedYear: data.foundedYear || null,
    headquarters: data.headquarters || null,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    parentOrganizationId: data.parentOrganizationId || null,
    activities: data.activities || null,
    knowledgeElements: data.knowledgeElements || null,
    validationStatus: data.validationStatus || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    enrichedData: data.enrichedData || null,
    preferences: data.preferences || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 