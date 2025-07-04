/**
 * Entity Mappers - Convert between different entity formats
 * Now completely ontology-agnostic using the generic entity system
 */

import { GenericEntity, mapToGenericEntity, mapFromGenericEntity } from './dto-aliases';

/**
 * Map any entity to a generic entity
 */
export function mapEntityToGenericEntity(entity: any): GenericEntity {
  return mapToGenericEntity(entity);
}

/**
 * Map any entity to a generic entity with specific type
 */
export function mapEntityToGenericEntityWithType(entity: any, type: string): GenericEntity {
  return mapToGenericEntity(entity, type);
}

/**
 * Map generic entity back to plain object
 */
export function mapGenericEntityToPlain(entity: GenericEntity): Record<string, any> {
  return mapFromGenericEntity(entity);
}

// Backward compatibility exports - all use the same generic functions
export const mapEntityToDTO = mapEntityToGenericEntity;
export const mapDTOToEntity = mapGenericEntityToPlain; 