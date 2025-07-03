import { singleton } from 'tsyringe';
import { Fund } from './Fund.entity';
import { IFundRepository } from './Fund.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class FundService {
  constructor(private repository: IFundRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Fund | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Fund by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Fund[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Fund entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Fund): Promise<Fund | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Fund:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Fund>): Promise<Fund | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Fund ${id}:`, error);
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
      logger.error(`Error deleting Fund ${id}:`, error);
      return false;
    }
  }


} 