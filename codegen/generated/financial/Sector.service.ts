import { singleton } from 'tsyringe';
import { Sector } from './Sector.entity';
import { ISectorRepository } from './Sector.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class SectorService {
  constructor(private repository: ISectorRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Sector | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Sector by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Sector[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Sector entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Sector): Promise<Sector | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Sector:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Sector>): Promise<Sector | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Sector ${id}:`, error);
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
      logger.error(`Error deleting Sector ${id}:`, error);
      return false;
    }
  }


  /**
   * Find similar entities
   */
  async findSimilar(entity: Sector, limit?: number): Promise<Sector[]> {
    try {
      return await this.repository.findSimilar(entity, limit);
    } catch (error) {
      logger.error('Error finding similar Sector entities:', error);
      return [];
    }
  }
} 