/**
 * LotDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface LotDTO {
  id: string;
  type: string;
  label: string;
  name?: string;
  description?: string;
  value?: number;
  category?: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isLotDTO(obj: any): obj is LotDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createLotDTO(data: Partial<LotDTO>): LotDTO {
  return {
    id: data.id || '',
    type: data.type || 'Lot',
    label: data.label || 'Lot',
    name: data.name,
    description: data.description,
    value: data.value,
    category: data.category,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 