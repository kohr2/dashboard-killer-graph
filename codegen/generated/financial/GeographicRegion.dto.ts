/**
 * GeographicRegionDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface GeographicRegionDTO {
  id: string;
  type: string;
  label: string;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isGeographicRegionDTO(obj: any): obj is GeographicRegionDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createGeographicRegionDTO(data: Partial<GeographicRegionDTO>): GeographicRegionDTO {
  return {
    id: data.id || '',
    type: data.type || 'GeographicRegion',
    label: data.label || 'GeographicRegion',
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 