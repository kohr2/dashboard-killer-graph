/**
 * CommunicationDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface CommunicationDTO {
  id: string;
  type: string;
  label: string;
  id: string;
  type: string;
  status: string;
  subject: string;
  body: string;
  sender: string;
  recipients: any[];
  timestamp: Date;
  metadata: Record<string, any>;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isCommunicationDTO(obj: any): obj is CommunicationDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.id === 'string' &&
         typeof obj.type === 'string' &&
         typeof obj.status === 'string' &&
         typeof obj.subject === 'string' &&
         typeof obj.body === 'string' &&
         typeof obj.sender === 'string' &&
         typeof obj.recipients === 'any[]' &&
         typeof obj.timestamp === 'Date' &&
         typeof obj.metadata === 'Record<string, any>';
}

export function createCommunicationDTO(data: Partial<CommunicationDTO>): CommunicationDTO {
  return {
    id: data.id || '',
    type: data.type || 'Communication',
    label: data.label || 'Communication',
    id: data.id || null,
    type: data.type || null,
    status: data.status || null,
    subject: data.subject || null,
    body: data.body || null,
    sender: data.sender || null,
    recipients: data.recipients || null,
    timestamp: data.timestamp || null,
    metadata: data.metadata || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 