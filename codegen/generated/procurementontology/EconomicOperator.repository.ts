/**
 * IEconomicOperatorRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { EconomicOperator } from './EconomicOperator.entity';

export interface IEconomicOperatorRepository {
  findById(id: string): Promise<EconomicOperator | null>;
  findAll(): Promise<EconomicOperator[]>;
  create(entity: EconomicOperator): Promise<EconomicOperator>;
  update(id: string, entity: Partial<EconomicOperator>): Promise<EconomicOperator>;
  delete(id: string): Promise<void>;
}

export abstract class BaseEconomicOperatorRepository implements IEconomicOperatorRepository {
  abstract findById(id: string): Promise<EconomicOperator | null>;
  abstract findAll(): Promise<EconomicOperator[]>;
  abstract create(entity: EconomicOperator): Promise<EconomicOperator>;
  abstract update(id: string, entity: Partial<EconomicOperator>): Promise<EconomicOperator>;
  abstract delete(id: string): Promise<void>;
  

} 