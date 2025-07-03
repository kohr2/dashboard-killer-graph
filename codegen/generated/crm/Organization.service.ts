import { singleton } from 'tsyringe';
import { Organization } from './Organization.entity';
import { IOrganizationRepository } from './Organization.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class OrganizationService {
  constructor(private repository: IOrganizationRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Organization | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Organization by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Organization[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Organization entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Organization): Promise<Organization | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Organization:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Organization>): Promise<Organization | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Organization ${id}:`, error);
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
      logger.error(`Error deleting Organization ${id}:`, error);
      return false;
    }
  }

  /**
   * Find entity by key properties
   */
  async findBylegalNameAndindustry(legalName: string, industry: string): Promise<Organization | null> {
    try {
      return await this.repository.findBylegalNameAndindustry(legalName, industry);
    } catch (error) {
      logger.error(`Error finding Organization by key properties:`, error);
      return null;
    }
  }

  /**
   * Find similar entities
   */
  async findSimilar(entity: Organization, limit?: number): Promise<Organization[]> {
    try {
      return await this.repository.findSimilar(entity, limit);
    } catch (error) {
      logger.error('Error finding similar Organization entities:', error);
      return [];
    }
  }
} 