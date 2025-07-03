import { singleton } from 'tsyringe';
import { Criterion } from './Criterion.entity';
import { ICriterionRepository } from './Criterion.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class CriterionService {
  constructor(private repository: ICriterionRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Criterion | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Criterion by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Criterion[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Criterion entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Criterion): Promise<Criterion | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Criterion:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Criterion>): Promise<Criterion | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Criterion ${id}:`, error);
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
      logger.error(`Error deleting Criterion ${id}:`, error);
      return false;
    }
  }


} 