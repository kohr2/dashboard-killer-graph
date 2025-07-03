/**
 * IPhoneNumberRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { PhoneNumber } from './PhoneNumber.entity';

export interface IPhoneNumberRepository {
  findById(id: string): Promise<PhoneNumber | null>;
  findAll(): Promise<PhoneNumber[]>;
  create(entity: PhoneNumber): Promise<PhoneNumber>;
  update(id: string, entity: Partial<PhoneNumber>): Promise<PhoneNumber>;
  delete(id: string): Promise<void>;
}

export abstract class BasePhoneNumberRepository implements IPhoneNumberRepository {
  abstract findById(id: string): Promise<PhoneNumber | null>;
  abstract findAll(): Promise<PhoneNumber[]>;
  abstract create(entity: PhoneNumber): Promise<PhoneNumber>;
  abstract update(id: string, entity: Partial<PhoneNumber>): Promise<PhoneNumber>;
  abstract delete(id: string): Promise<void>;
  

} 