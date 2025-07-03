/**
 * EconomicOperatorDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface EconomicOperatorDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isEconomicOperatorDTO(obj: any): obj is EconomicOperatorDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createEconomicOperatorDTO(data: Partial<EconomicOperatorDTO>): EconomicOperatorDTO {
  return {
    id: data.id || '',
    type: data.type || 'EconomicOperator',
    label: data.label || 'EconomicOperator',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 