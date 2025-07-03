import { BaseEntity } from '@shared/types/base-entity';

export interface Lot extends BaseEntity {
  name: string;
  description: string;
  value: number;
  category: string;
}

export class LotEntity implements Lot {
  name!: string;
  description!: string;
  value!: number;
  category!: string;

  constructor(data: Partial<Lot>) {
    Object.assign(this, data);
  }



} 