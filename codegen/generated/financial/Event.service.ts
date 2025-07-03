import { singleton } from 'tsyringe';
import { Event } from './Event.entity';
import { IEventRepository } from './Event.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class EventService {
  constructor(private repository: IEventRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Event | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Event by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Event[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Event entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Event): Promise<Event | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Event:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Event>): Promise<Event | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Event ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.repository.delete(id);
      return true;
    } catch (error) {
      logger.error(`Error deleting Event ${id}:`, error);
      return false;
    }
  }


} 