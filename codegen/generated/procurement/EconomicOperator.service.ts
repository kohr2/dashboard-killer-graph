import { singleton } from 'tsyringe';
import { EconomicOperator } from './EconomicOperator.entity';
import { IEconomicOperatorRepository } from './EconomicOperator.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class EconomicOperatorService {
  constructor(private repository: IEconomicOperatorRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<EconomicOperator | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding EconomicOperator by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<EconomicOperator[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all EconomicOperator entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: EconomicOperator): Promise<EconomicOperator | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating EconomicOperator:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<EconomicOperator>): Promise<EconomicOperator | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating EconomicOperator ${id}:`, error);
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
      logger.error(`Error deleting EconomicOperator ${id}:`, error);
      return false;
    }
  }


} 