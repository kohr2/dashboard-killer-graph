/**
 * IEventRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Event } from './Event.entity';

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  findAll(): Promise<Event[]>;
  create(entity: Event): Promise<Event>;
  update(id: string, entity: Partial<Event>): Promise<Event>;
  delete(id: string): Promise<void>;
}

export abstract class BaseEventRepository implements IEventRepository {
  abstract findById(id: string): Promise<Event | null>;
  abstract findAll(): Promise<Event[]>;
  abstract create(entity: Event): Promise<Event>;
  abstract update(id: string, entity: Partial<Event>): Promise<Event>;
  abstract delete(id: string): Promise<void>;
  

} 