import { BaseEntity } from '@shared/types/base-entity';

export interface Supplier extends BaseEntity {
  name: string;
  specialization: string;
  size: string;
}

export class SupplierEntity implements Supplier {
  name!: string;
  specialization!: string;
  size!: string;

  constructor(data: Partial<Supplier>) {
    Object.assign(this, data);
  }



} 