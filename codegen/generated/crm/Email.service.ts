import { singleton } from 'tsyringe';
import { Email } from './Email.entity';
import { IEmailRepository } from './Email.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class EmailService {
  constructor(private repository: IEmailRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Email | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Email by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Email[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Email entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Email): Promise<Email | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Email:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Email>): Promise<Email | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Email ${id}:`, error);
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
      logger.error(`Error deleting Email ${id}:`, error);
      return false;
    }
  }


} 