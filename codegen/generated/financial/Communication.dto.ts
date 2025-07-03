/**
 * CommunicationDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface CommunicationDTO {
  id: string;
  type: string;
  label: string;
  subject?: string;
  date?: any;
  participants?: any[];
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isCommunicationDTO(obj: any): obj is CommunicationDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createCommunicationDTO(data: Partial<CommunicationDTO>): CommunicationDTO {
  return {
    id: data.id || '',
    type: data.type || 'Communication',
    label: data.label || 'Communication',
    subject: data.subject,
    date: data.date,
    participants: data.participants,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 