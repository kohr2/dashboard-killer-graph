/**
 * LotDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface LotDTO {
  id: string;
  type: string;
  label: string;
  name: string;
  description: string;
  value: number;
  category: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isLotDTO(obj: any): obj is LotDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.description === 'string' &&
         typeof obj.value === 'number' &&
         typeof obj.category === 'string';
}

export function createLotDTO(data: Partial<LotDTO>): LotDTO {
  return {
    id: data.id || '',
    type: data.type || 'Lot',
    label: data.label || 'Lot',
    name: data.name || null,
    description: data.description || null,
    value: data.value || null,
    category: data.category || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 