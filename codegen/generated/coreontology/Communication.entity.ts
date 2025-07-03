import { BaseEntity } from '@shared/types/base-entity';

export interface Communication extends BaseEntity {
  id: string;
  type: string;
  status: string;
  subject: string;
  body: string;
  sender: string;
  recipients: any[];
  timestamp: Date;
  metadata: Record&lt;string, any&gt;;
}

export class CommunicationEntity implements Communication {
  id!: string;
  type!: string;
  status!: string;
  subject!: string;
  body!: string;
  sender!: string;
  recipients!: any[];
  timestamp!: Date;
  metadata!: Record&lt;string, any&gt;;

  constructor(data: Partial<Communication>) {
    Object.assign(this, data);
  }

  /**
   * Get key properties for this entity
   */
  getKeyProperties(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      sender: this.sender,
      timestamp: this.timestamp,
    };
  }

  /**
   * Get vector representation for this entity
   */
  getVectorRepresentation(): string {
    return `${this.type}:${this.name}`;
  }

} 