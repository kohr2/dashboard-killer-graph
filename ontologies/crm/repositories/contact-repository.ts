import { ContactDTO } from '@generated/crm/generated/ContactDTO';

export interface ContactRepository {
  save(contact: ContactDTO): Promise<ContactDTO>;
  findById(id: string): Promise<ContactDTO | null>;
  findAll(): Promise<ContactDTO[]>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<ContactDTO[]>;
  findByEmail(email: string): Promise<ContactDTO | null>;
  addEmailToContact(contactId: string, email: string): Promise<void>;
}

