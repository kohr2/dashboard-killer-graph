import { singleton } from 'tsyringe';
import { PhoneNumber } from './PhoneNumber.entity';
import { IPhoneNumberRepository } from './PhoneNumber.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class PhoneNumberService {
  constructor(private repository: IPhoneNumberRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<PhoneNumber | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding PhoneNumber by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<PhoneNumber[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all PhoneNumber entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: PhoneNumber): Promise<PhoneNumber | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating PhoneNumber:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<PhoneNumber>): Promise<PhoneNumber | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating PhoneNumber ${id}:`, error);
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
      logger.error(`Error deleting PhoneNumber ${id}:`, error);
      return false;
    }
  }


} 