/**
 * PhoneNumberDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface PhoneNumberDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isPhoneNumberDTO(obj: any): obj is PhoneNumberDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createPhoneNumberDTO(data: Partial<PhoneNumberDTO>): PhoneNumberDTO {
  return {
    id: data.id || '',
    type: data.type || 'PhoneNumber',
    label: data.label || 'PhoneNumber',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 