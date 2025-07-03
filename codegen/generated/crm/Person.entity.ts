import { BaseEntity } from '@shared/types/base-entity';

export interface Person extends BaseEntity {
}

export class PersonEntity implements Person {

  constructor(data: Partial<Person>) {
    Object.assign(this, data);
  }

  /**
   * Get key properties for this entity
   */
  getKeyProperties(): Record<string, any> {
    return {
      email: this.email,
      title: this.title,
    };
  }

  /**
   * Get vector representation for this entity
   */
  getVectorRepresentation(): string {
    return `${this.type}:${this.name}`;
  }

} 