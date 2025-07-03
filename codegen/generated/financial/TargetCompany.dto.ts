/**
 * TargetCompanyDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface TargetCompanyDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isTargetCompanyDTO(obj: any): obj is TargetCompanyDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createTargetCompanyDTO(data: Partial<TargetCompanyDTO>): TargetCompanyDTO {
  return {
    id: data.id || '',
    type: data.type || 'TargetCompany',
    label: data.label || 'TargetCompany',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 