import { singleton } from 'tsyringe';
import { RegulatoryInformation } from './RegulatoryInformation.entity';
import { IRegulatoryInformationRepository } from './RegulatoryInformation.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class RegulatoryInformationService {
  constructor(private repository: IRegulatoryInformationRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<RegulatoryInformation | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding RegulatoryInformation by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<RegulatoryInformation[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all RegulatoryInformation entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: RegulatoryInformation): Promise<RegulatoryInformation | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating RegulatoryInformation:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<RegulatoryInformation>): Promise<RegulatoryInformation | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating RegulatoryInformation ${id}:`, error);
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
      logger.error(`Error deleting RegulatoryInformation ${id}:`, error);
      return false;
    }
  }


} 