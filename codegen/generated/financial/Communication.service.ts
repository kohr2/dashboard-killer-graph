import { singleton } from 'tsyringe';
import { Communication } from './Communication.entity';
import { ICommunicationRepository } from './Communication.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class CommunicationService {
  constructor(private repository: ICommunicationRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Communication | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Communication by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Communication[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Communication entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Communication): Promise<Communication | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Communication:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Communication>): Promise<Communication | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Communication ${id}:`, error);
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
      logger.error(`Error deleting Communication ${id}:`, error);
      return false;
    }
  }


} 