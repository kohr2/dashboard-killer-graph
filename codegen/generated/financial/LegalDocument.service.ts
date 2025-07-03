import { singleton } from 'tsyringe';
import { LegalDocument } from './LegalDocument.entity';
import { ILegalDocumentRepository } from './LegalDocument.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class LegalDocumentService {
  constructor(private repository: ILegalDocumentRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<LegalDocument | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding LegalDocument by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<LegalDocument[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all LegalDocument entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: LegalDocument): Promise<LegalDocument | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating LegalDocument:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<LegalDocument>): Promise<LegalDocument | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating LegalDocument ${id}:`, error);
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
      logger.error(`Error deleting LegalDocument ${id}:`, error);
      return false;
    }
  }


} 