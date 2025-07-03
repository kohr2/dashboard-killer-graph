/**
 * IInvestorRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { Investor } from './Investor.entity';

export interface IInvestorRepository {
  findById(id: string): Promise<Investor | null>;
  findAll(): Promise<Investor[]>;
  create(entity: Investor): Promise<Investor>;
  update(id: string, entity: Partial<Investor>): Promise<Investor>;
  delete(id: string): Promise<void>;
}

export abstract class BaseInvestorRepository implements IInvestorRepository {
  abstract findById(id: string): Promise<Investor | null>;
  abstract findAll(): Promise<Investor[]>;
  abstract create(entity: Investor): Promise<Investor>;
  abstract update(id: string, entity: Partial<Investor>): Promise<Investor>;
  abstract delete(id: string): Promise<void>;
  

} 