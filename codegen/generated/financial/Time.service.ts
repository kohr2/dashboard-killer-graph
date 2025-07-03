import { singleton } from 'tsyringe';
import { Time } from './Time.entity';
import { ITimeRepository } from './Time.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class TimeService {
  constructor(private repository: ITimeRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Time | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Time by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Time[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Time entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Time): Promise<Time | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Time:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Time>): Promise<Time | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Time ${id}:`, error);
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
      logger.error(`Error deleting Time ${id}:`, error);
      return false;
    }
  }


} 