/**
 * DTO Aliases for EDGAR Enrichment Service Migration
 * 
 * This file provides aliases to bridge between legacy domain entities
 * and the new generated DTOs during the incremental migration process.
 */

// Import generated DTOs
import { OrganizationDTO } from '@generated/crm/generated/OrganizationDTO';
import { PersonDTO } from '@generated/crm/generated/PersonDTO';
import { ContactDTO } from '@generated/crm/generated/ContactDTO';
import { CommunicationDTO } from '@generated/crm/generated/CommunicationDTO';
import { InvestorDTO } from '@generated/financial/generated/InvestorDTO';
import { DealDTO } from '@generated/financial/generated/DealDTO';

/**
 * Type alias for EnrichableEntity to use generated DTOs only
 */
export type EnrichableEntity = OrganizationDTO | PersonDTO | ContactDTO | CommunicationDTO | InvestorDTO | DealDTO;

/**
 * Type guard to check if an entity is an OrganizationDTO
 */
export function isOrganizationDTO(entity: EnrichableEntity): entity is OrganizationDTO {
  return (
    typeof entity === 'object' &&
    'id' in entity &&
    'name' in entity &&
    'type' in entity &&
    entity.type === 'Organization'
  );
}

/**
 * Type guard to check if an entity is a PersonDTO
 */
export function isPersonDTO(entity: EnrichableEntity): entity is PersonDTO {
  return (
    typeof entity === 'object' &&
    'id' in entity &&
    'name' in entity &&
    'type' in entity &&
    entity.type === 'Person'
  );
}

/**
 * Type guard to check if an entity is a ContactDTO
 */
export function isContactDTO(entity: EnrichableEntity): entity is ContactDTO {
  return (
    typeof entity === 'object' &&
    'id' in entity &&
    'name' in entity &&
    'type' in entity &&
    'email' in entity &&
    'title' in entity &&
    entity.type === 'Contact'
  );
}

/**
 * Type guard to check if an entity is a CommunicationDTO
 */
export function isCommunicationDTO(entity: EnrichableEntity): entity is CommunicationDTO {
  return (
    typeof entity === 'object' &&
    'id' in entity &&
    'type' in entity &&
    'status' in entity &&
    'sender' in entity &&
    'recipients' in entity
  );
}

export type { OrganizationDTO, PersonDTO, ContactDTO, CommunicationDTO };

// Contact/Person mappers
export const mapContactToDTO = (contact: any): ContactDTO => ({
  id: contact.id || contact.getId?.() || '',
  name: contact.name || contact.getName?.() || '',
  type: contact.type || 'Contact',
  label: contact.label || contact.getName?.() || '',
  enrichedData: contact.enrichedData || '',
  email: contact.email || contact.personalInfo?.email || '',
  title: contact.title || contact.personalInfo?.title || '',
  firstName: contact.firstName || contact.personalInfo?.firstName || '',
  lastName: contact.lastName || contact.personalInfo?.lastName || '',
  phone: contact.phone || contact.personalInfo?.phone || '',
  description: contact.description || contact.personalInfo?.description || '',
  organizationId: contact.organizationId || '',
  activities: contact.activities || '',
  knowledgeElements: contact.knowledgeElements || '',
  validationStatus: contact.validationStatus || 'VALID',
  createdAt: contact.createdAt || new Date().toISOString(),
  updatedAt: contact.updatedAt || new Date().toISOString(),
  additionalEmails: contact.additionalEmails || '',
  address: contact.address || contact.personalInfo?.address || '',
  preferences: contact.preferences || '',
});

export const mapDTOToContact = (dto: ContactDTO): any => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  label: dto.label,
  enrichedData: dto.enrichedData,
  personalInfo: {
    email: dto.email,
    title: dto.title,
    firstName: dto.firstName,
    lastName: dto.lastName,
    phone: dto.phone,
    address: dto.address,
  },
  description: dto.description,
  organizationId: dto.organizationId,
  activities: dto.activities,
  knowledgeElements: dto.knowledgeElements,
  validationStatus: dto.validationStatus,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  additionalEmails: dto.additionalEmails,
  preferences: dto.preferences,
  // Add legacy method stubs
  getId: () => dto.id,
  getName: () => dto.name,
  addActivity: (id: string) => ({ id }),
  addKnowledgeElement: (id: string) => ({ id }),
  getActivities: () => [],
  getKnowledgeElements: () => [],
  getOntologyMetadata: () => ({ validationStatus: dto.validationStatus }),
});

export const mapPersonToDTO = (person: any): PersonDTO => ({
  id: person.id || person.getId?.() || '',
  name: person.name || person.getName?.() || '',
  type: person.type || 'Person',
  label: person.label || person.getName?.() || '',
  enrichedData: person.enrichedData || '',
});

export const mapDTOToPerson = (dto: PersonDTO): any => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  label: dto.label,
  enrichedData: dto.enrichedData,
  // Add legacy method stubs
  getId: () => dto.id,
  getName: () => dto.name,
  addActivity: (id: string) => ({ id }),
  addKnowledgeElement: (id: string) => ({ id }),
  getActivities: () => [],
  getKnowledgeElements: () => [],
  getOntologyMetadata: () => ({ validationStatus: 'VALID' }),
});

// Organization mappers
export const mapOrganizationToDTO = (organization: any): OrganizationDTO => ({
  id: organization.id || organization.getId?.() || '',
  name: organization.name || organization.getName?.() || '',
  type: organization.type || 'Organization',
  label: organization.label || organization.getName?.() || '',
  enrichedData: organization.enrichedData || '',
  legalName: organization.legalName || organization.getLegalName?.() || '',
  industry: organization.industry || organization.getIndustry?.() || '',
  website: organization.website || organization.getWebsite?.() || '',
  description: organization.description || organization.getDescription?.() || '',
  size: organization.size || organization.getSize?.() || '',
  foundedYear: organization.foundedYear || organization.getFoundedYear?.() || '',
  headquarters: organization.headquarters || organization.getHeadquarters?.() || '',
  address: organization.address || organization.getAddress?.() || '',
  phone: organization.phone || organization.getPhone?.() || '',
  email: organization.email || organization.getEmail?.() || '',
  parentOrganizationId: organization.parentOrganizationId || organization.getParentOrganizationId?.() || '',
  activities: organization.activities || organization.getActivities?.() || '',
  knowledgeElements: organization.knowledgeElements || organization.getKnowledgeElements?.() || '',
  validationStatus: organization.validationStatus || organization.getValidationStatus?.() || 'VALID',
  createdAt: organization.createdAt || organization.getCreatedAt?.() || new Date().toISOString(),
  updatedAt: organization.updatedAt || organization.getUpdatedAt?.() || new Date().toISOString(),
  preferences: organization.preferences || organization.getPreferences?.() || '',
});

export const mapDTOToOrganization = (dto: OrganizationDTO): any => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  label: dto.label,
  enrichedData: dto.enrichedData,
  legalName: dto.legalName,
  industry: dto.industry,
  website: dto.website,
  description: dto.description,
  size: dto.size,
  foundedYear: dto.foundedYear,
  headquarters: dto.headquarters,
  address: dto.address,
  phone: dto.phone,
  email: dto.email,
  parentOrganizationId: dto.parentOrganizationId,
  activities: dto.activities,
  knowledgeElements: dto.knowledgeElements,
  validationStatus: dto.validationStatus,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  preferences: dto.preferences,
  // Add legacy method stubs
  getId: () => dto.id,
  getName: () => dto.name,
  getLegalName: () => dto.legalName,
  getIndustry: () => dto.industry,
  getWebsite: () => dto.website,
  getDescription: () => dto.description,
  getSize: () => dto.size,
  getFoundedYear: () => dto.foundedYear,
  getHeadquarters: () => dto.headquarters,
  getAddress: () => dto.address,
  getPhone: () => dto.phone,
  getEmail: () => dto.email,
  getParentOrganizationId: () => dto.parentOrganizationId,
  getActivities: () => [],
  getKnowledgeElements: () => [],
  getValidationStatus: () => dto.validationStatus,
  getCreatedAt: () => dto.createdAt,
  getUpdatedAt: () => dto.updatedAt,
  getPreferences: () => dto.preferences,
  addActivity: (id: string) => ({ id }),
  addKnowledgeElement: (id: string) => ({ id }),
  getOntologyMetadata: () => ({ validationStatus: dto.validationStatus }),
});

// Communication mappers
export const mapCommunicationToDTO = (comm: any): CommunicationDTO => ({
  id: comm.id || comm.getId?.() || '',
  name: comm.name || comm.subject || comm.getName?.() || '',
  type: comm.type || comm.getType?.() || '',
  label: comm.label || comm.getLabel?.() || '',
  enrichedData: comm.enrichedData || comm.metadata || '',
  status: comm.status || comm.getStatus?.() || '',
  subject: comm.subject || comm.getSubject?.() || '',
  body: comm.body || comm.getBody?.() || '',
  sender: comm.sender || comm.getSender?.() || '',
  recipients: comm.recipients || comm.getRecipients?.() || '',
  timestamp: comm.timestamp ? (typeof comm.timestamp === 'string' ? comm.timestamp : comm.timestamp.toISOString()) : '',
  metadata: comm.metadata || comm.getMetadata?.() || '',
  channel: comm.channel || comm.getChannel?.() || '',
  priority: comm.priority || comm.getPriority?.() || '',
  duration: comm.duration || comm.getDuration?.() || '',
  attachments: comm.attachments || comm.getAttachments?.() || '',
  tags: comm.tags || comm.getTags?.() || '',
  createdAt: comm.createdAt || new Date().toISOString(),
  updatedAt: comm.updatedAt || new Date().toISOString(),
});

export const mapDTOToCommunication = (dto: CommunicationDTO): any => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  label: dto.label,
  enrichedData: dto.enrichedData,
  status: dto.status,
  subject: dto.subject,
  body: dto.body,
  sender: dto.sender,
  recipients: dto.recipients,
  timestamp: dto.timestamp,
  metadata: dto.metadata,
  channel: dto.channel,
  priority: dto.priority,
  duration: dto.duration,
  attachments: dto.attachments,
  tags: dto.tags,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  // Add legacy method stubs
  getId: () => dto.id,
  getName: () => dto.name,
  getType: () => dto.type,
  getStatus: () => dto.status,
  getSubject: () => dto.subject,
  getBody: () => dto.body,
  getSender: () => dto.sender,
  getRecipients: () => dto.recipients,
  getTimestamp: () => dto.timestamp,
  getMetadata: () => dto.metadata,
  getChannel: () => dto.channel,
  getPriority: () => dto.priority,
  getDuration: () => dto.duration,
  getAttachments: () => dto.attachments,
  getTags: () => dto.tags,
  getCreatedAt: () => dto.createdAt,
  getUpdatedAt: () => dto.updatedAt,
  getOntologyMetadata: () => ({ status: dto.status }),
});

// Financial DTO type guards
export function isInvestorDTO(entity: EnrichableEntity): entity is InvestorDTO {
  return (
    typeof entity === 'object' &&
    'id' in entity &&
    'name' in entity &&
    'type' in entity &&
    'aum' in entity &&
    entity.type === 'Investor'
  );
}

export function isDealDTO(entity: EnrichableEntity): entity is DealDTO {
  return (
    typeof entity === 'object' &&
    'id' in entity &&
    'name' in entity &&
    'type' in entity &&
    'dealSize' in entity &&
    'sector' in entity &&
    'dealType' in entity &&
    entity.type === 'Deal'
  );
}

// Financial DTO mappers
export const mapInvestorToDTO = (investor: any): InvestorDTO => ({
  id: investor.id || investor.getId?.() || '',
  name: investor.name || investor.getName?.() || '',
  type: investor.type || 'Investor',
  label: investor.label || investor.getName?.() || '',
  enrichedData: investor.enrichedData || '',
  aum: investor.aum || investor.getAum?.() || '',
});

export const mapDTOToInvestor = (dto: InvestorDTO): any => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  label: dto.label,
  enrichedData: dto.enrichedData,
  aum: dto.aum,
  // Add legacy method stubs
  getId: () => dto.id,
  getName: () => dto.name,
  getAum: () => dto.aum,
  getType: () => dto.type,
  getLabel: () => dto.label,
  getEnrichedData: () => dto.enrichedData,
});

export const mapDealToDTO = (deal: any): DealDTO => ({
  id: deal.id || deal.getId?.() || '',
  name: deal.name || deal.getName?.() || '',
  type: deal.type || 'Deal',
  label: deal.label || deal.getName?.() || '',
  enrichedData: deal.enrichedData || '',
  dealSize: deal.dealSize || deal.getDealSize?.() || '',
  sector: deal.sector || deal.getSector?.() || '',
  dealType: deal.dealType || deal.getDealType?.() || '',
  purpose: deal.purpose || deal.getPurpose?.() || '',
  status: deal.status || deal.getStatus?.() || '',
});

export const mapDTOToDeal = (dto: DealDTO): any => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  label: dto.label,
  enrichedData: dto.enrichedData,
  dealSize: dto.dealSize,
  sector: dto.sector,
  dealType: dto.dealType,
  purpose: dto.purpose,
  status: dto.status,
  // Add legacy method stubs
  getId: () => dto.id,
  getName: () => dto.name,
  getDealSize: () => dto.dealSize,
  getSector: () => dto.sector,
  getDealType: () => dto.dealType,
  getPurpose: () => dto.purpose,
  getStatus: () => dto.status,
  getType: () => dto.type,
  getLabel: () => dto.label,
  getEnrichedData: () => dto.enrichedData,
});

export type { InvestorDTO, DealDTO };

// Contact factory function to replace ContactOntology.createOCreamContact
export const createContactDTO = (data: {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  address?: any;
  organizationId?: string;
  preferences?: Record<string, any>;
}): ContactDTO => {
  const contactId = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  
  return {
    id: contactId,
    name: name || data.email || 'Unknown Contact',
    type: 'Contact',
    label: name || data.email || 'Unknown Contact',
    enrichedData: '',
    email: data.email || '',
    title: data.title || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    phone: data.phone || '',
    description: `Contact entity for ${data.email || 'unknown'}`,
    organizationId: data.organizationId || '',
    activities: '',
    knowledgeElements: '',
    validationStatus: 'VALID',
    createdAt: now,
    updatedAt: now,
    additionalEmails: '',
    address: data.address || '',
    preferences: data.preferences ? JSON.stringify(data.preferences) : '',
  };
}; 