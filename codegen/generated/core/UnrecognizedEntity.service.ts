import { singleton } from 'tsyringe';
import { UnrecognizedEntity } from './UnrecognizedEntity.entity';
import { IUnrecognizedEntityRepository } from './UnrecognizedEntity.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class UnrecognizedEntityService {
  constructor(private repository: IUnrecognizedEntityRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<UnrecognizedEntity | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding UnrecognizedEntity by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<UnrecognizedEntity[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all UnrecognizedEntity entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: UnrecognizedEntity): Promise<UnrecognizedEntity | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating UnrecognizedEntity:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<UnrecognizedEntity>): Promise<UnrecognizedEntity | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating UnrecognizedEntity ${id}:`, error);
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
      logger.error(`Error deleting UnrecognizedEntity ${id}:`, error);
      return false;
    }
  }


} 