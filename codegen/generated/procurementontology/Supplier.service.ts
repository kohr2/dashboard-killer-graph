import { singleton } from 'tsyringe';
import { Supplier } from './Supplier.entity';
import { ISupplierRepository } from './Supplier.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class SupplierService {
  constructor(private repository: ISupplierRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Supplier | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Supplier by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Supplier[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Supplier entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Supplier): Promise<Supplier | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Supplier:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Supplier>): Promise<Supplier | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Supplier ${id}:`, error);
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
      logger.error(`Error deleting Supplier ${id}:`, error);
      return false;
    }
  }


} 