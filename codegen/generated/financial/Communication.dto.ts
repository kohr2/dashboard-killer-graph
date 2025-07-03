/**
 * CommunicationDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface CommunicationDTO {
  id: string;
  type: string;
  label: string;
  subject: string;
  date: any;
  type: string;
  participants: any[];
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isCommunicationDTO(obj: any): obj is CommunicationDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.subject === 'string' &&
         typeof obj.date === 'any' &&
         typeof obj.type === 'string' &&
         typeof obj.participants === 'any[]';
}

export function createCommunicationDTO(data: Partial<CommunicationDTO>): CommunicationDTO {
  return {
    id: data.id || '',
    type: data.type || 'Communication',
    label: data.label || 'Communication',
    subject: data.subject || null,
    date: data.date || null,
    type: data.type || null,
    participants: data.participants || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 