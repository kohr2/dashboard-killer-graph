import { singleton } from 'tsyringe';
import { Sponsor } from './Sponsor.entity';
import { ISponsorRepository } from './Sponsor.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class SponsorService {
  constructor(private repository: ISponsorRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Sponsor | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Sponsor by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Sponsor[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Sponsor entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Sponsor): Promise<Sponsor | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Sponsor:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Sponsor>): Promise<Sponsor | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Sponsor ${id}:`, error);
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
      logger.error(`Error deleting Sponsor ${id}:`, error);
      return false;
    }
  }


} 