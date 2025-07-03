import { singleton } from 'tsyringe';
import { Percent } from './Percent.entity';
import { IPercentRepository } from './Percent.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class PercentService {
  constructor(private repository: IPercentRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Percent | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Percent by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Percent[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Percent entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Percent): Promise<Percent | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Percent:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Percent>): Promise<Percent | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Percent ${id}:`, error);
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
      logger.error(`Error deleting Percent ${id}:`, error);
      return false;
    }
  }


} 