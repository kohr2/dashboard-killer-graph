import { singleton } from 'tsyringe';
import { Activity } from './Activity.entity';
import { IActivityRepository } from './Activity.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ActivityService {
  constructor(private repository: IActivityRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Activity | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Activity by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Activity[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Activity entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Activity): Promise<Activity | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Activity:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Activity>): Promise<Activity | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Activity ${id}:`, error);
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
      logger.error(`Error deleting Activity ${id}:`, error);
      return false;
    }
  }


} 