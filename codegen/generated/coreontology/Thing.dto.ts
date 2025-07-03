/**
 * ThingDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ThingDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isThingDTO(obj: any): obj is ThingDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createThingDTO(data: Partial<ThingDTO>): ThingDTO {
  return {
    id: data.id || '',
    type: data.type || 'Thing',
    label: data.label || 'Thing',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 