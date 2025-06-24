// In-Memory Contact Repository Implementation
// Provides in-memory storage for testing and development

import { Contact } from '../../domain/entities/contact';
import { ContactRepository, PaginationOptions } from '../../domain/repositories/contact-repository';

export class InMemoryContactRepository implements ContactRepository {
  private contacts: Map<string, Contact> = new Map();

  async save(contact: Contact): Promise<Contact> {
    this.contacts.set(contact.getId(), contact);
    return contact;
  }

  async findById(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async findAll(options?: PaginationOptions): Promise<Contact[]> {
    const allContacts = Array.from(this.contacts.values());
    
    if (!options) {
      return allContacts;
    }

    const { page, limit } = options;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return allContacts.slice(startIndex, endIndex);
  }

  async delete(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async findByEmail(email: string): Promise<Contact | undefined> {
    for (const contact of this.contacts.values()) {
      if (contact.getEmail() === email) {
        return contact;
      }
    }
    return undefined;
  }

  async findByOrganizationId(organizationId: string): Promise<Contact[]> {
    // For now, return empty array - we'll implement organization relationships later
    return [];
  }

  async search(query: string): Promise<Contact[]> {
    const searchTerm = query.toLowerCase();
    const results: Contact[] = [];

    for (const contact of this.contacts.values()) {
      const name = contact.getName().toLowerCase();
      const email = contact.getEmail().toLowerCase();
      
      if (name.includes(searchTerm) || email.includes(searchTerm)) {
        results.push(contact);
      }
    }

    return results;
  }

  async count(): Promise<number> {
    return this.contacts.size;
  }

  async exists(id: string): Promise<boolean> {
    return this.contacts.has(id);
  }
} 