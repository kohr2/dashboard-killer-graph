/**
 * DocumentDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface DocumentDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isDocumentDTO(obj: any): obj is DocumentDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createDocumentDTO(data: Partial<DocumentDTO>): DocumentDTO {
  return {
    id: data.id || '',
    type: data.type || 'Document',
    label: data.label || 'Document',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 