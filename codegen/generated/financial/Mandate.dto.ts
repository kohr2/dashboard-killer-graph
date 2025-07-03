/**
 * MandateDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface MandateDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isMandateDTO(obj: any): obj is MandateDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createMandateDTO(data: Partial<MandateDTO>): MandateDTO {
  return {
    id: data.id || '',
    type: data.type || 'Mandate',
    label: data.label || 'Mandate',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 