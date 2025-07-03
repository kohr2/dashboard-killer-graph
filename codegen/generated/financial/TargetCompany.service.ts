import { singleton } from 'tsyringe';
import { TargetCompany } from './TargetCompany.entity';
import { ITargetCompanyRepository } from './TargetCompany.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class TargetCompanyService {
  constructor(private repository: ITargetCompanyRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<TargetCompany | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding TargetCompany by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<TargetCompany[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all TargetCompany entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: TargetCompany): Promise<TargetCompany | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating TargetCompany:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<TargetCompany>): Promise<TargetCompany | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating TargetCompany ${id}:`, error);
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
      logger.error(`Error deleting TargetCompany ${id}:`, error);
      return false;
    }
  }

  /**
   * Find entity by key properties
   */
  async findByindustryAndwebsite(industry: string, website: string): Promise<TargetCompany | null> {
    try {
      return await this.repository.findByindustryAndwebsite(industry, website);
    } catch (error) {
      logger.error(`Error finding TargetCompany by key properties:`, error);
      return null;
    }
  }

  /**
   * Find similar entities
   */
  async findSimilar(entity: TargetCompany, limit?: number): Promise<TargetCompany[]> {
    try {
      return await this.repository.findSimilar(entity, limit);
    } catch (error) {
      logger.error('Error finding similar TargetCompany entities:', error);
      return [];
    }
  }
} 