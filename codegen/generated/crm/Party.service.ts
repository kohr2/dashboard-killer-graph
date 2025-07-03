import { singleton } from 'tsyringe';
import { Party } from './Party.entity';
import { IPartyRepository } from './Party.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class PartyService {
  constructor(private repository: IPartyRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Party | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Party by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Party[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Party entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Party): Promise<Party | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Party:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Party>): Promise<Party | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Party ${id}:`, error);
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
      logger.error(`Error deleting Party ${id}:`, error);
      return false;
    }
  }


} 