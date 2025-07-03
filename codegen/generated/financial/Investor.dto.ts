/**
 * InvestorDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface InvestorDTO {
  id: string;
  type: string;
  label: string;
  name: string;
  type: string;
  aum: number;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isInvestorDTO(obj: any): obj is InvestorDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.type === 'string' &&
         typeof obj.aum === 'number';
}

export function createInvestorDTO(data: Partial<InvestorDTO>): InvestorDTO {
  return {
    id: data.id || '',
    type: data.type || 'Investor',
    label: data.label || 'Investor',
    name: data.name || null,
    type: data.type || null,
    aum: data.aum || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 