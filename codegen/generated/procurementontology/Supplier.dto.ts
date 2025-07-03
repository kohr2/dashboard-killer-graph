/**
 * SupplierDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface SupplierDTO {
  id: string;
  type: string;
  label: string;
  name?: string;
  specialization?: string;
  size?: string;
  enrichedData?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function isSupplierDTO(obj: any): obj is SupplierDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string';
}

export function createSupplierDTO(data: Partial<SupplierDTO>): SupplierDTO {
  return {
    id: data.id || '',
    type: data.type || 'Supplier',
    label: data.label || 'Supplier',
    name: data.name,
    specialization: data.specialization,
    size: data.size,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 