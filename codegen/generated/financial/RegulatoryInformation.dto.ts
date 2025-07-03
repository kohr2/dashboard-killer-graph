/**
 * RegulatoryInformationDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface RegulatoryInformationDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isRegulatoryInformationDTO(obj: any): obj is RegulatoryInformationDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createRegulatoryInformationDTO(data: Partial<RegulatoryInformationDTO>): RegulatoryInformationDTO {
  return {
    id: data.id || '',
    type: data.type || 'RegulatoryInformation',
    label: data.label || 'RegulatoryInformation',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 