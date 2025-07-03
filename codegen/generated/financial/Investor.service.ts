import { singleton } from 'tsyringe';
import { Investor } from './Investor.entity';
import { IInvestorRepository } from './Investor.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class InvestorService {
  constructor(private repository: IInvestorRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Investor | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Investor by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Investor[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Investor entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Investor): Promise<Investor | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Investor:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Investor>): Promise<Investor | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Investor ${id}:`, error);
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
      logger.error(`Error deleting Investor ${id}:`, error);
      return false;
    }
  }


} 