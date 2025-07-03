import { singleton } from 'tsyringe';
import { Process } from './Process.entity';
import { IProcessRepository } from './Process.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ProcessService {
  constructor(private repository: IProcessRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Process | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Process by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Process[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Process entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Process): Promise<Process | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Process:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Process>): Promise<Process | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Process ${id}:`, error);
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
      logger.error(`Error deleting Process ${id}:`, error);
      return false;
    }
  }


} 