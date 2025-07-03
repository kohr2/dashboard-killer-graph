import { singleton } from 'tsyringe';
import { Lot } from './Lot.entity';
import { ILotRepository } from './Lot.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class LotService {
  constructor(private repository: ILotRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Lot | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Lot by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Lot[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Lot entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Lot): Promise<Lot | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Lot:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Lot>): Promise<Lot | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Lot ${id}:`, error);
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
      logger.error(`Error deleting Lot ${id}:`, error);
      return false;
    }
  }


} 