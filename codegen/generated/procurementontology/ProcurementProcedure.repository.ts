/**
 * IProcurementProcedureRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { ProcurementProcedure } from './ProcurementProcedure.entity';

export interface IProcurementProcedureRepository {
  findById(id: string): Promise<ProcurementProcedure | null>;
  findAll(): Promise<ProcurementProcedure[]>;
  create(entity: ProcurementProcedure): Promise<ProcurementProcedure>;
  update(id: string, entity: Partial<ProcurementProcedure>): Promise<ProcurementProcedure>;
  delete(id: string): Promise<void>;
}

export abstract class BaseProcurementProcedureRepository implements IProcurementProcedureRepository {
  abstract findById(id: string): Promise<ProcurementProcedure | null>;
  abstract findAll(): Promise<ProcurementProcedure[]>;
  abstract create(entity: ProcurementProcedure): Promise<ProcurementProcedure>;
  abstract update(id: string, entity: Partial<ProcurementProcedure>): Promise<ProcurementProcedure>;
  abstract delete(id: string): Promise<void>;
  

} 