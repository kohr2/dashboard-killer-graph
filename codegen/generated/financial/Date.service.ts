import { singleton } from 'tsyringe';
import { Date } from './Date.entity';
import { IDateRepository } from './Date.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class DateService {
  constructor(private repository: IDateRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Date | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Date by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Date[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Date entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Date): Promise<Date | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Date:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Date>): Promise<Date | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Date ${id}:`, error);
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
      logger.error(`Error deleting Date ${id}:`, error);
      return false;
    }
  }


} 