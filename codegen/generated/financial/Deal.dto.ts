/**
 * DealDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface DealDTO {
  id: string;
  type: string;
  label: string;
  dealSize: ;
  sector: ;
  dealType: ;
  purpose: ;
  status: ;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isDealDTO(obj: any): obj is DealDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.dealSize === '' &&
         typeof obj.sector === '' &&
         typeof obj.dealType === '' &&
         typeof obj.purpose === '' &&
         typeof obj.status === '';
}

export function createDealDTO(data: Partial<DealDTO>): DealDTO {
  return {
    id: data.id || '',
    type: data.type || 'Deal',
    label: data.label || 'Deal',
    dealSize: data.dealSize || null,
    sector: data.sector || null,
    dealType: data.dealType || null,
    purpose: data.purpose || null,
    status: data.status || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 