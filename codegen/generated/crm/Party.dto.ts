/**
 * PartyDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface PartyDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isPartyDTO(obj: any): obj is PartyDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createPartyDTO(data: Partial<PartyDTO>): PartyDTO {
  return {
    id: data.id || '',
    type: data.type || 'Party',
    label: data.label || 'Party',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 