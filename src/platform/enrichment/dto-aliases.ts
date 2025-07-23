/**
 * Simplified, ontology-agnostic DTO system for enrichment services
 */

// Generic base interface for any entity from any ontology
export interface GenericEntity {
  id: string;
  type: string;
  label: string;
  name?: string;
  enrichedData?: Record<string, any>;
  [key: string]: any; // Allow any additional properties
}

// Simple enrichment result
export interface EnrichmentResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

// Simple type guard
export function isGenericEntity(entity: any): entity is GenericEntity {
  return entity && 
         typeof entity === 'object' && 
         typeof entity.id === 'string' && 
         typeof entity.type === 'string' && 
         typeof entity.label === 'string';
}

// Simple entity creation
export function createGenericEntity(type: string, data: Record<string, any> = {}): GenericEntity {
  return {
    id: data.id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    label: data.label || data.name || type,
    name: data.name || data.label || type,
    enrichedData: data.enrichedData || {},
    ...data
  };
}

// Export the generic entity type as the main DTO type
export type EnrichableEntity = GenericEntity; 