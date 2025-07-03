/**
 * PersonDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface PersonDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isPersonDTO(obj: any): obj is PersonDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createPersonDTO(data: Partial<PersonDTO>): PersonDTO {
  return {
    id: data.id || '',
    type: data.type || 'Person',
    label: data.label || 'Person',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 