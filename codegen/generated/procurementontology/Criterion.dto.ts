/**
 * CriterionDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface CriterionDTO {
  id: string;
  type: string;
  label: string;
  id: ;
  name: ;
  description: ;
  type: ;
  weight: ;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isCriterionDTO(obj: any): obj is CriterionDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.id === '' &&
         typeof obj.name === '' &&
         typeof obj.description === '' &&
         typeof obj.type === '' &&
         typeof obj.weight === '';
}

export function createCriterionDTO(data: Partial<CriterionDTO>): CriterionDTO {
  return {
    id: data.id || '',
    type: data.type || 'Criterion',
    label: data.label || 'Criterion',
    id: data.id || null,
    name: data.name || null,
    description: data.description || null,
    type: data.type || null,
    weight: data.weight || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 