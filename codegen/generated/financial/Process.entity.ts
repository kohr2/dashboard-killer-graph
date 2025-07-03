import { BaseEntity } from '@shared/types/base-entity';

export interface Process extends BaseEntity {
}

export class ProcessEntity implements Process {

  constructor(data: Partial<Process>) {
    Object.assign(this, data);
  }



} 