import { BaseEntity } from '@shared/types/base-entity';

export interface Communication extends BaseEntity {
  subject: string;
  date: any;
  type: string;
  participants: any[];
}

export class CommunicationEntity implements Communication {
  subject!: string;
  date!: any;
  type!: string;
  participants!: any[];

  constructor(data: Partial<Communication>) {
    Object.assign(this, data);
  }



} 