/**
 * SupplierDTO - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

export interface SupplierDTO {
  id: string;
  type: string;
  label: string;
  name: ;
  specialization: ;
  size: ;
  enrichedData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function isSupplierDTO(obj: any): obj is SupplierDTO {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string' && 
         typeof obj.label === 'string' &&
         typeof obj.name === '' &&
         typeof obj.specialization === '' &&
         typeof obj.size === '';
}

export function createSupplierDTO(data: Partial<SupplierDTO>): SupplierDTO {
  return {
    id: data.id || '',
    type: data.type || 'Supplier',
    label: data.label || 'Supplier',
    name: data.name || null,
    specialization: data.specialization || null,
    size: data.size || null,
    enrichedData: data.enrichedData,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
} 