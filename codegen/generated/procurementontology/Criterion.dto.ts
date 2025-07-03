/**
 * CriterionDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface CriterionDTO {
  id: string;
  type: string;
  label: string;
  name?: string;
  description?: string;
  weight?: number;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isCriterionDTO(obj: any): obj is CriterionDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createCriterionDTO(data: Partial<CriterionDTO>): CriterionDTO {
  return {
    id: data.id || '',
    type: data.type || 'Criterion',
    label: data.label || 'Criterion',
    name: data.name,
    description: data.description,
    weight: data.weight,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 