/**
 * Generic, ontology-agnostic DTO system for enrichment services
 * This provides a flexible interface that works with any ontology without hard-coding entity types
 */

// Generic base interface for any entity from any ontology
export interface GenericEntity {
  id: string;
  type: string;
  label: string;
  name?: string;
  enrichedData?: Record<string, any>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: any; // Allow any additional properties from any ontology
}

// Generic enrichment result
export interface EnrichmentResult {
  success?: boolean;
  data?: Record<string, any>;
  error?: string;
  metadata?: Record<string, any>;
  [key: string]: any; // allow arbitrary extra fields like cik, legalName, etc.
}

// Generic type guard for any entity
export function isGenericEntity(entity: any): entity is GenericEntity {
  return entity && 
         typeof entity === 'object' && 
         typeof entity.id === 'string' && 
         typeof entity.type === 'string' && 
         typeof entity.label === 'string';
}

// Generic DTO creation function
export function createGenericEntity(type: string, data: Record<string, any> = {}): GenericEntity {
  return {
    id: data.id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    label: data.label || data.name || type,
    name: data.name || data.label || type,
    enrichedData: data.enrichedData || {},
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    ...data
  };
}

// Generic mapping function - converts any object to GenericEntity
export function mapToGenericEntity(entity: any, type?: string): GenericEntity {
  if (isGenericEntity(entity)) {
    return entity;
  }
  
  const entityType = type || entity.type || entity.label || 'Unknown';
  return createGenericEntity(entityType, {
    name: entity.name || entity.label || entity.id,
    label: entity.label || entity.name || entity.id,
    ...entity
  });
}

// Generic reverse mapping function
export function mapFromGenericEntity(entity: GenericEntity): Record<string, any> {
  return {
    ...entity,
    name: entity.name || entity.label || entity.id
  };
}

// Generic enrichment function type
export type EnrichmentFunction = (entity: GenericEntity) => Promise<EnrichmentResult>;

// Generic entity factory - creates entities of any type
export function createEntityFactory<T extends GenericEntity = GenericEntity>(
  defaultType: string
): (data: Partial<T>) => T {
  return (data: Partial<T>): T => {
    return createGenericEntity(defaultType, data) as T;
  };
}

// Generic entity validator - validates any entity against basic requirements
export function validateGenericEntity(entity: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!entity) {
    errors.push('Entity is null or undefined');
    return { valid: false, errors };
  }
  
  if (typeof entity !== 'object') {
    errors.push('Entity must be an object');
    return { valid: false, errors };
  }
  
  if (!entity.id || typeof entity.id !== 'string') {
    errors.push('Entity must have a valid string id');
  }
  
  if (!entity.type || typeof entity.type !== 'string') {
    errors.push('Entity must have a valid string type');
  }
  
  if (!entity.label || typeof entity.label !== 'string') {
    errors.push('Entity must have a valid string label');
  }
  
  return { valid: errors.length === 0, errors };
}

// Generic entity merger - merges two entities of any type
export function mergeGenericEntities(
  base: GenericEntity, 
  updates: Partial<GenericEntity>
): GenericEntity {
  return {
    ...base,
    ...updates,
    enrichedData: {
      ...base.enrichedData,
      ...updates.enrichedData
    },
    updatedAt: new Date()
  };
}

// Generic entity comparator - compares entities by their core properties
export function compareGenericEntities(a: GenericEntity, b: GenericEntity): boolean {
  return a.id === b.id && a.type === b.type && a.label === b.label;
}

// Generic entity serializer - converts entity to plain object
export function serializeGenericEntity(entity: GenericEntity): Record<string, any> {
  return {
    id: entity.id,
    type: entity.type,
    label: entity.label,
    name: entity.name,
    enrichedData: entity.enrichedData,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
}

// Generic entity deserializer - converts plain object to entity
export function deserializeGenericEntity(data: Record<string, any>): GenericEntity {
  return createGenericEntity(data.type || 'Unknown', data);
}

// Export the generic entity type as the main DTO type
export type EnrichableEntity = GenericEntity; 