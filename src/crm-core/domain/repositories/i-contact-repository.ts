import { OCreamContactEntity } from '../entities/contact-ontology';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ContactRepository {
  save(contact: OCreamContactEntity): Promise<void>;
  findById(id: string): Promise<OCreamContactEntity | null>;
  findAll(options?: PaginationOptions): Promise<OCreamContactEntity[]>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<OCreamContactEntity[]>;
} 