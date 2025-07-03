import { singleton } from 'tsyringe';
import { ProcuringEntity } from './ProcuringEntity.entity';
import { IProcuringEntityRepository } from './ProcuringEntity.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ProcuringEntityService {
  constructor(private repository: IProcuringEntityRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<ProcuringEntity | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding ProcuringEntity by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<ProcuringEntity[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all ProcuringEntity entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: ProcuringEntity): Promise<ProcuringEntity | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating ProcuringEntity:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<ProcuringEntity>): Promise<ProcuringEntity | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating ProcuringEntity ${id}:`, error);
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
      logger.error(`Error deleting ProcuringEntity ${id}:`, error);
      return false;
    }
  }


} 