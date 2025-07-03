import { BaseEntity } from '@shared/types/base-entity';

export interface ProcurementProcedure extends BaseEntity {
}

export class ProcurementProcedureEntity implements ProcurementProcedure {

  constructor(data: Partial<ProcurementProcedure>) {
    Object.assign(this, data);
  }



} 