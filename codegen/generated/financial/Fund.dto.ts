/**
 * FundDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface FundDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isFundDTO(obj: any): obj is FundDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createFundDTO(data: Partial<FundDTO>): FundDTO {
  return {
    id: data.id || '',
    type: data.type || 'Fund',
    label: data.label || 'Fund',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 