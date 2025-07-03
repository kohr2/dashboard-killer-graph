/**
 * ActivityDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface ActivityDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isActivityDTO(obj: any): obj is ActivityDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createActivityDTO(data: Partial<ActivityDTO>): ActivityDTO {
  return {
    id: data.id || '',
    type: data.type || 'Activity',
    label: data.label || 'Activity',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 