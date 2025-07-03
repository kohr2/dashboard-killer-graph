import { BaseEntity } from '@shared/types/base-entity';

export interface Criterion extends BaseEntity {
  name: string;
  description: string;
  weight: number;
}

export class CriterionEntity implements Criterion {
  name!: string;
  description!: string;
  weight!: number;

  constructor(data: Partial<Criterion>) {
    Object.assign(this, data);
  }



} 