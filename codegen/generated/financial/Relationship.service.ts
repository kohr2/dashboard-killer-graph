import { singleton } from 'tsyringe';
import { Relationship } from './Relationship.entity';
import { IRelationshipRepository } from './Relationship.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class RelationshipService {
  constructor(private repository: IRelationshipRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Relationship | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Relationship by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Relationship[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Relationship entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Relationship): Promise<Relationship | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Relationship:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Relationship>): Promise<Relationship | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Relationship ${id}:`, error);
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
      logger.error(`Error deleting Relationship ${id}:`, error);
      return false;
    }
  }


} 