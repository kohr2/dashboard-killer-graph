/**
 * DealDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface DealDTO {
  id: string;
  type: string;
  label: string;
  dealSize?: number;
  sector?: string;
  dealType?: string;
  purpose?: string;
  status?: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isDealDTO(obj: any): obj is DealDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createDealDTO(data: Partial<DealDTO>): DealDTO {
  return {
    id: data.id || '',
    type: data.type || 'Deal',
    label: data.label || 'Deal',
    dealSize: data.dealSize,
    sector: data.sector,
    dealType: data.dealType,
    purpose: data.purpose,
    status: data.status,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 