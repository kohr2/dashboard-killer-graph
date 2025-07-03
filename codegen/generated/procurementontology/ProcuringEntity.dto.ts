/**
 * ProcuringEntityDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ProcuringEntityDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isProcuringEntityDTO(obj: any): obj is ProcuringEntityDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createProcuringEntityDTO(data: Partial<ProcuringEntityDTO>): ProcuringEntityDTO {
  return {
    id: data.id || '',
    type: data.type || 'ProcuringEntity',
    label: data.label || 'ProcuringEntity',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 