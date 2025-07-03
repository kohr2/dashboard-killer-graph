/**
 * ISupplierRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Supplier } from './Supplier.entity';

export interface ISupplierRepository {
  findById(id: string): Promise<Supplier | null>;
  findAll(): Promise<Supplier[]>;
  create(entity: Supplier): Promise<Supplier>;
  update(id: string, entity: Partial<Supplier>): Promise<Supplier>;
  delete(id: string): Promise<void>;
}

export abstract class BaseSupplierRepository implements ISupplierRepository {
  abstract findById(id: string): Promise<Supplier | null>;
  abstract findAll(): Promise<Supplier[]>;
  abstract create(entity: Supplier): Promise<Supplier>;
  abstract update(id: string, entity: Partial<Supplier>): Promise<Supplier>;
  abstract delete(id: string): Promise<void>;
  

} 