import { singleton } from 'tsyringe';
import { MonetaryAmount } from './MonetaryAmount.entity';
import { IMonetaryAmountRepository } from './MonetaryAmount.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class MonetaryAmountService {
  constructor(private repository: IMonetaryAmountRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<MonetaryAmount | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding MonetaryAmount by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<MonetaryAmount[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all MonetaryAmount entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: MonetaryAmount): Promise<MonetaryAmount | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating MonetaryAmount:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<MonetaryAmount>): Promise<MonetaryAmount | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating MonetaryAmount ${id}:`, error);
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
      logger.error(`Error deleting MonetaryAmount ${id}:`, error);
      return false;
    }
  }


} 