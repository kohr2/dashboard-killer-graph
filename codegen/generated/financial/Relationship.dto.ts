/**
 * RelationshipDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface RelationshipDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isRelationshipDTO(obj: any): obj is RelationshipDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createRelationshipDTO(data: Partial<RelationshipDTO>): RelationshipDTO {
  return {
    id: data.id || '',
    type: data.type || 'Relationship',
    label: data.label || 'Relationship',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 