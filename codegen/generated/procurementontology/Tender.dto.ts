/**
 * TenderDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface TenderDTO {
  id: string;
  type: string;
  label: string;
  title: ;
  value: ;
  deadline: ;
  category: ;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isTenderDTO(obj: any): obj is TenderDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.title === '' &&
         typeof obj.value === '' &&
         typeof obj.deadline === '' &&
         typeof obj.category === '';
}

export function createTenderDTO(data: Partial<TenderDTO>): TenderDTO {
  return {
    id: data.id || '',
    type: data.type || 'Tender',
    label: data.label || 'Tender',
    title: data.title || null,
    value: data.value || null,
    deadline: data.deadline || null,
    category: data.category || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 