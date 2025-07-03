import { singleton } from 'tsyringe';
import { Person } from './Person.entity';
import { IPersonRepository } from './Person.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class PersonService {
  constructor(private repository: IPersonRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Person | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Person by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Person[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Person entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Person): Promise<Person | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Person:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Person>): Promise<Person | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Person ${id}:`, error);
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
      logger.error(`Error deleting Person ${id}:`, error);
      return false;
    }
  }

  /**
   * Find entity by key properties
   */
  async findByemailAndtitle(email: string, title: string): Promise<Person | null> {
    try {
      return await this.repository.findByemailAndtitle(email, title);
    } catch (error) {
      logger.error(`Error finding Person by key properties:`, error);
      return null;
    }
  }

  /**
   * Find similar entities
   */
  async findSimilar(entity: Person, limit?: number): Promise<Person[]> {
    try {
      return await this.repository.findSimilar(entity, limit);
    } catch (error) {
      logger.error('Error finding similar Person entities:', error);
      return [];
    }
  }
} 