/**
 * TenderDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface TenderDTO {
  id: string;
  type: string;
  label: string;
  title?: string;
  value?: number;
  deadline?: any;
  category?: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isTenderDTO(obj: any): obj is TenderDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createTenderDTO(data: Partial<TenderDTO>): TenderDTO {
  return {
    id: data.id || '',
    type: data.type || 'Tender',
    label: data.label || 'Tender',
    title: data.title,
    value: data.value,
    deadline: data.deadline,
    category: data.category,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 