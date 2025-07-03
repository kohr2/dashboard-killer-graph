/**
 * PercentDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface PercentDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isPercentDTO(obj: any): obj is PercentDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createPercentDTO(data: Partial<PercentDTO>): PercentDTO {
  return {
    id: data.id || '',
    type: data.type || 'Percent',
    label: data.label || 'Percent',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 