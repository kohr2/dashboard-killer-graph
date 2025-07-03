import { singleton } from 'tsyringe';
import { ContactPoint } from './ContactPoint.entity';
import { IContactPointRepository } from './ContactPoint.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ContactPointService {
  constructor(private repository: IContactPointRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<ContactPoint | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding ContactPoint by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<ContactPoint[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all ContactPoint entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: ContactPoint): Promise<ContactPoint | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating ContactPoint:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<ContactPoint>): Promise<ContactPoint | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating ContactPoint ${id}:`, error);
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
      logger.error(`Error deleting ContactPoint ${id}:`, error);
      return false;
    }
  }


} 