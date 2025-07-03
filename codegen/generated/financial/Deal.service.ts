import { singleton } from 'tsyringe';
import { Deal } from './Deal.entity';
import { IDealRepository } from './Deal.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class DealService {
  constructor(private repository: IDealRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Deal | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Deal by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Deal[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Deal entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Deal): Promise<Deal | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Deal:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Deal>): Promise<Deal | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Deal ${id}:`, error);
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
      logger.error(`Error deleting Deal ${id}:`, error);
      return false;
    }
  }

  /**
   * Find entity by key properties
   */
  async findBydealTypeAndsectorAndpurpose(dealType: string, sector: string, purpose: string): Promise<Deal | null> {
    try {
      return await this.repository.findBydealTypeAndsectorAndpurpose(dealType, sector, purpose);
    } catch (error) {
      logger.error(`Error finding Deal by key properties:`, error);
      return null;
    }
  }

  /**
   * Find similar entities
   */
  async findSimilar(entity: Deal, limit?: number): Promise<Deal[]> {
    try {
      return await this.repository.findSimilar(entity, limit);
    } catch (error) {
      logger.error('Error finding similar Deal entities:', error);
      return [];
    }
  }
} 