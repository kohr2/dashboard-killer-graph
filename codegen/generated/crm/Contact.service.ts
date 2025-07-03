import { singleton } from 'tsyringe';
import { Contact } from './Contact.entity';
import { IContactRepository } from './Contact.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ContactService {
  constructor(private repository: IContactRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Contact | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding Contact by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<Contact[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all Contact entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: Contact): Promise<Contact | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating Contact:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<Contact>): Promise<Contact | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating Contact ${id}:`, error);
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
      logger.error(`Error deleting Contact ${id}:`, error);
      return false;
    }
  }

  /**
   * Find entity by key properties
   */
  async findByidAndemail(id: string, email: string): Promise<Contact | null> {
    try {
      return await this.repository.findByidAndemail(id, email);
    } catch (error) {
      logger.error(`Error finding Contact by key properties:`, error);
      return null;
    }
  }

  /**
   * Find similar entities
   */
  async findSimilar(entity: Contact, limit?: number): Promise<Contact[]> {
    try {
      return await this.repository.findSimilar(entity, limit);
    } catch (error) {
      logger.error('Error finding similar Contact entities:', error);
      return [];
    }
  }
} 