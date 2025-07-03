import { singleton } from 'tsyringe';
import { Document } from './Document.entity';
import { IDocumentRepository } from './Document.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class DocumentService {
  constructor(private repository: IDocumentRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Document | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Document by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Document[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Document entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Document): Promise<Document | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Document:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Document>): Promise<Document | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Document ${id}:`, error);
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
      logger.error(`Error deleting Document ${id}:`, error);
      return false;
    }
  }


} 