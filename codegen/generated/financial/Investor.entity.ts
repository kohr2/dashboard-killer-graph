import { BaseEntity } from '@shared/types/base-entity';

export interface Investor extends BaseEntity {
  name: string;
  aum: number;
}

export class InvestorEntity implements Investor {
  name!: string;
  aum!: number;

  constructor(data: Partial<Investor>) {
    Object.assign(this, data);
  }



} 