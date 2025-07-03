/**
 * ICommunicationRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Communication } from './Communication.entity';

export interface ICommunicationRepository {
  findById(id: string): Promise<Communication | null>;
  findAll(): Promise<Communication[]>;
  create(entity: Communication): Promise<Communication>;
  update(id: string, entity: Partial<Communication>): Promise<Communication>;
  delete(id: string): Promise<void>;
  findByidAndtypeAndsenderAndtimestamp(id: string, type: string, sender: string, timestamp: string): Promise<Communication | null>;
  findSimilar(entity: Communication, limit?: number): Promise<Communication[]>;
}

export abstract class BaseCommunicationRepository implements ICommunicationRepository {
  abstract findById(id: string): Promise<Communication | null>;
  abstract findAll(): Promise<Communication[]>;
  abstract create(entity: Communication): Promise<Communication>;
  abstract update(id: string, entity: Partial<Communication>): Promise<Communication>;
  abstract delete(id: string): Promise<void>;
  
  async findByidAndtypeAndsenderAndtimestamp(id: string, type: string, sender: string, timestamp: string): Promise<Communication | null> {
    const all = await this.findAll();
    return all.find(entity => entity.id === id && entity.type === type && entity.sender === sender && entity.timestamp === timestamp) || null;
  }

  async findSimilar(entity: Communication, limit: number = 10): Promise<Communication[]> {
    // Implementation would depend on vector similarity algorithm
    const all = await this.findAll();
    return all.filter(e => e.id !== entity.id).slice(0, limit);
  }
} 