import { singleton } from 'tsyringe';
import { Tender } from './Tender.entity';
import { ITenderRepository } from './Tender.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class TenderService {
  constructor(private repository: ITenderRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Tender | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Tender by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Tender[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Tender entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Tender): Promise<Tender | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Tender:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Tender>): Promise<Tender | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Tender ${id}:`, error);
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
      logger.error(`Error deleting Tender ${id}:`, error);
      return false;
    }
  }


} 