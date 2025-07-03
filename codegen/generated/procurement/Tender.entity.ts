import { BaseEntity } from '@shared/types/base-entity';

export interface Tender extends BaseEntity {
  title: string;
  value: number;
  deadline: any;
  category: string;
}

export class TenderEntity implements Tender {
  title!: string;
  value!: number;
  deadline!: any;
  category!: string;

  constructor(data: Partial<Tender>) {
    Object.assign(this, data);
  }



} 