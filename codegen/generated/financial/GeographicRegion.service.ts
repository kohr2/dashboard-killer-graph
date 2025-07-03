import { singleton } from 'tsyringe';
import { GeographicRegion } from './GeographicRegion.entity';
import { IGeographicRegionRepository } from './GeographicRegion.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class GeographicRegionService {
  constructor(private repository: IGeographicRegionRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<GeographicRegion | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding GeographicRegion by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<GeographicRegion[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all GeographicRegion entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: GeographicRegion): Promise<GeographicRegion | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating GeographicRegion:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<GeographicRegion>): Promise<GeographicRegion | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating GeographicRegion ${id}:`, error);
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
      logger.error(`Error deleting GeographicRegion ${id}:`, error);
      return false;
    }
  }

  /**
   * Find entity by key properties
   */
  async findBycountry(country: string): Promise<GeographicRegion | null> {
    try {
      return await this.repository.findBycountry(country);
    } catch (error) {
      logger.error(`Error finding GeographicRegion by key properties:`, error);
      return null;
    }
  }

} 