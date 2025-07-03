/**
 * IRegulatoryInformationRepository - generated from ontology.json
 * DO NOT EDIT MANUALLY. Changes will be overwritten.
 */

import { RegulatoryInformation } from './RegulatoryInformation.entity';

export interface IRegulatoryInformationRepository {
  findById(id: string): Promise<RegulatoryInformation | null>;
  findAll(): Promise<RegulatoryInformation[]>;
  create(entity: RegulatoryInformation): Promise<RegulatoryInformation>;
  update(id: string, entity: Partial<RegulatoryInformation>): Promise<RegulatoryInformation>;
  delete(id: string): Promise<void>;
}

export abstract class BaseRegulatoryInformationRepository implements IRegulatoryInformationRepository {
  abstract findById(id: string): Promise<RegulatoryInformation | null>;
  abstract findAll(): Promise<RegulatoryInformation[]>;
  abstract create(entity: RegulatoryInformation): Promise<RegulatoryInformation>;
  abstract update(id: string, entity: Partial<RegulatoryInformation>): Promise<RegulatoryInformation>;
  abstract delete(id: string): Promise<void>;
  

} 