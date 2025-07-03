/**
 * MonetaryAmountDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface MonetaryAmountDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isMonetaryAmountDTO(obj: any): obj is MonetaryAmountDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createMonetaryAmountDTO(data: Partial<MonetaryAmountDTO>): MonetaryAmountDTO {
  return {
    id: data.id || '',
    type: data.type || 'MonetaryAmount',
    label: data.label || 'MonetaryAmount',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 