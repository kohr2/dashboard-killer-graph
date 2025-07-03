import { singleton } from 'tsyringe';
import { Mandate } from './Mandate.entity';
import { IMandateRepository } from './Mandate.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class MandateService {
  constructor(private repository: IMandateRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Mandate | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Mandate by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Mandate[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Mandate entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Mandate): Promise<Mandate | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Mandate:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Mandate>): Promise<Mandate | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Mandate ${id}:`, error);
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
      logger.error(`Error deleting Mandate ${id}:`, error);
      return false;
    }
  }


} 