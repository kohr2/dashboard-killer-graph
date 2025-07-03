import { singleton } from 'tsyringe';
import { Location } from './Location.entity';
import { ILocationRepository } from './Location.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class LocationService {
  constructor(private repository: ILocationRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Location | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Location by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Location[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Location entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Location): Promise<Location | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Location:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Location>): Promise<Location | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Location ${id}:`, error);
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
      logger.error(`Error deleting Location ${id}:`, error);
      return false;
    }
  }


  /**
   * Find similar entities
   */
  async findSimilar(entity: Location, limit?: number): Promise<Location[]> {
    try {
      return await this.repository.findSimilar(entity, limit);
    } catch (error) {
      logger.error('Error finding similar Location entities:', error);
      return [];
    }
  }
} 