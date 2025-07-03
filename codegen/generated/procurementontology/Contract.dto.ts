/**
 * ContractDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ContractDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isContractDTO(obj: any): obj is ContractDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createContractDTO(data: Partial<ContractDTO>): ContractDTO {
  return {
    id: data.id || '',
    type: data.type || 'Contract',
    label: data.label || 'Contract',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 