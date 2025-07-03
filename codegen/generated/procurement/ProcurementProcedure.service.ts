import { singleton } from 'tsyringe';
import { ProcurementProcedure } from './ProcurementProcedure.entity';
import { IProcurementProcedureRepository } from './ProcurementProcedure.repository';
import { logger } from '@shared/utils/logger';

@singleton()
export class ProcurementProcedureService {
  constructor(private repository: IProcurementProcedureRepository) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<ProcurementProcedure | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error finding ProcurementProcedure by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all entities
   */
  async findAll(): Promise<ProcurementProcedure[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error finding all ProcurementProcedure entities:', error);
      return [];
    }
  }

  /**
   * Create new entity
   */
  async create(entity: ProcurementProcedure): Promise<ProcurementProcedure | null> {
    try {
      return await this.repository.create(entity);
    } catch (error) {
      logger.error('Error creating ProcurementProcedure:', error);
      return null;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, entity: Partial<ProcurementProcedure>): Promise<ProcurementProcedure | null> {
    try {
      return await this.repository.update(id, entity);
    } catch (error) {
      logger.error(`Error updating ProcurementProcedure ${id}:`, error);
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
      logger.error(`Error deleting ProcurementProcedure ${id}:`, error);
      return false;
    }
  }


} 