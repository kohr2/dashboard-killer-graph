import { BaseEntity } from '@shared/types/base-entity';

export interface ProcuringEntity extends BaseEntity {
}

export class ProcuringEntityEntity implements ProcuringEntity {

  constructor(data: Partial<ProcuringEntity>) {
    Object.assign(this, data);
  }



} 