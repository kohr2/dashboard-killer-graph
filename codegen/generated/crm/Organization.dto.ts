/**
 * OrganizationDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface OrganizationDTO {
  id: string;
  type: string;
  label: string;
  name: ;
  legalName: ;
  industry: ;
  website: ;
  description: ;
  size: ;
  foundedYear: ;
  headquarters: ;
  address: ;
  phone: ;
  email: ;
  parentOrganizationId: ;
  activities: ;
  knowledgeElements: ;
  validationStatus: ;
  createdAt: ;
  updatedAt: ;
  enrichedData: ;
  preferences: ;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isOrganizationDTO(obj: any): obj is OrganizationDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.name === '' &&
         typeof obj.legalName === '' &&
         typeof obj.industry === '' &&
         typeof obj.website === '' &&
         typeof obj.description === '' &&
         typeof obj.size === '' &&
         typeof obj.foundedYear === '' &&
         typeof obj.headquarters === '' &&
         typeof obj.address === '' &&
         typeof obj.phone === '' &&
         typeof obj.email === '' &&
         typeof obj.parentOrganizationId === '' &&
         typeof obj.activities === '' &&
         typeof obj.knowledgeElements === '' &&
         typeof obj.validationStatus === '' &&
         typeof obj.createdAt === '' &&
         typeof obj.updatedAt === '' &&
         typeof obj.enrichedData === '' &&
         typeof obj.preferences === '';
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