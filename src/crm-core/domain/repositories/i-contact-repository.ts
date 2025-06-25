
import { OCreamContactEntity } from '../entities/contact-ontology';

export interface ContactRepository {
  save(contact: OCreamContactEntity): Promise<OCreamContactEntity>;
  findById(id: string): Promise<OCreamContactEntity | null>;
  findAll(): Promise<OCreamContactEntity[]>;
  delete(id: string): Promise<void>;
  search(query: any): Promise<OCreamContactEntity[]>;
  findByEmail(email: string): Promise<OCreamContactEntity | null>;
}

