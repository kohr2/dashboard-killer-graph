import { singleton } from 'tsyringe';
import { Thing } from './Thing.entity';
import { IThingRepository } from './Thing.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ThingService {
  constructor(private repository: IThingRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Thing | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Thing by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Thing[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Thing entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Thing): Promise<Thing | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Thing:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Thing>): Promise<Thing | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Thing ${id}:`, error);
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
      logger.error(`Error deleting Thing ${id}:`, error);
      return false;
    }
  }


} 