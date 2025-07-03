/**
 * ProcurementProcedureDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ProcurementProcedureDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isProcurementProcedureDTO(obj: any): obj is ProcurementProcedureDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createProcurementProcedureDTO(data: Partial<ProcurementProcedureDTO>): ProcurementProcedureDTO {
  return {
    id: data.id || '',
    type: data.type || 'ProcurementProcedure',
    label: data.label || 'ProcurementProcedure',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 