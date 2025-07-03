/**
 * ContactPointDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ContactPointDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isContactPointDTO(obj: any): obj is ContactPointDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createContactPointDTO(data: Partial<ContactPointDTO>): ContactPointDTO {
  return {
    id: data.id || '',
    type: data.type || 'ContactPoint',
    label: data.label || 'ContactPoint',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 