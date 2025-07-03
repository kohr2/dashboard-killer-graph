/**
 * Entity Mappers for EDGAR Enrichment Service Migration
 * 
 * This file provides mappers to convert between legacy domain entities
 * and the new generated DTOs during the incremental migration process.
 */

import { OrganizationDTO } from '@generated/crm/generated/OrganizationDTO';
import { PersonDTO } from '@generated/crm/generated/PersonDTO';
import { ContactDTO } from '@generated/crm/generated/ContactDTO';
import { EnrichableEntity, isOrganizationDTO, isPersonDTO, isContactDTO } from './dto-aliases';

/**
 * Maps any entity to its corresponding DTO
 */
export function mapEntityToDTO(entity: EnrichableEntity): OrganizationDTO | PersonDTO | ContactDTO {
  if (isOrganizationDTO(entity)) {
    return entity;
  }
  if (isPersonDTO(entity)) {
    return entity;
  }
  if (isContactDTO(entity)) {
    return entity;
  }
  throw new Error('Unsupported entity type');
} 