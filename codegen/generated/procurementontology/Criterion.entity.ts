import { BaseEntity } from '@shared/types/base-entity';

export interface Criterion extends BaseEntity {
  id: string;
  name: string;
  description: string;
  type: string;
  weight: number;
}

export class CriterionEntity implements Criterion {
  id!: string;
  name!: string;
  description!: string;
  type!: string;
  weight!: number;

  constructor(data: Partial<Criterion>) {
    Object.assign(this, data);
  }



} 