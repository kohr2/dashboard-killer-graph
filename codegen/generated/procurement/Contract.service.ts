import { singleton } from 'tsyringe';
import { Contract } from './Contract.entity';
import { IContractRepository } from './Contract.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ContractService {
  constructor(private repository: IContractRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Contract | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Contract by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Contract[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Contract entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Contract): Promise<Contract | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Contract:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Contract>): Promise<Contract | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Contract ${id}:`, error);
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
      logger.error(`Error deleting Contract ${id}:`, error);
      return false;
    }
  }


} 