/**
 * UnrecognizedEntityDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface UnrecognizedEntityDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isUnrecognizedEntityDTO(obj: any): obj is UnrecognizedEntityDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createUnrecognizedEntityDTO(data: Partial<UnrecognizedEntityDTO>): UnrecognizedEntityDTO {
  return {
    id: data.id || '',
    type: data.type || 'UnrecognizedEntity',
    label: data.label || 'UnrecognizedEntity',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 