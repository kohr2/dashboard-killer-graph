/**
 * SponsorDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface SponsorDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isSponsorDTO(obj: any): obj is SponsorDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createSponsorDTO(data: Partial<SponsorDTO>): SponsorDTO {
  return {
    id: data.id || '',
    type: data.type || 'Sponsor',
    label: data.label || 'Sponsor',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 