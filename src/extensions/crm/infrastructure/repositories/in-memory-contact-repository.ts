// In-Memory Contact Repository Implementation
// Provides in-memory storage for testing and development

import { OCreamContactEntity } from '../../domain/entities/contact-ontology';
import { ContactRepository } from '../../domain/repositories/contact-repository';

export class InMemoryContactRepository implements ContactRepository {
  private contacts: Map<string, OCreamContactEntity> = new Map();

  async save(contact: OCreamContactEntity): Promise<OCreamContactEntity> {
    this.contacts.set(contact.getId(), contact);
    return contact;
  }

  async findById(id: string): Promise<OCreamContactEntity | null> {
    return this.contacts.get(id) || null;
  }

  async findAll(): Promise<OCreamContactEntity[]> {
    return Array.from(this.contacts.values());
  }

  async delete(id: string): Promise<void> {
    this.contacts.delete(id);
  }

  async findByEmail(email: string): Promise<OCreamContactEntity | null> {
    for (const contact of this.contacts.values()) {
      if (contact.personalInfo.email === email) {
        return contact;
      }
    }
    return null;
  }

  async findByOrganizationId(organizationId: string): Promise<OCreamContactEntity[]> {
    // For now, return empty array - we'll implement organization relationships later
    return [];
  }

  async search(query: string): Promise<OCreamContactEntity[]> {
    const searchTerm = query.toLowerCase();
    const results: OCreamContactEntity[] = [];

    for (const contact of this.contacts.values()) {
      const name = contact.getName().toLowerCase();
      const email = contact.personalInfo.email.toLowerCase();
      
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

  public async addEmailToContact(contactId: string, email: string): Promise<void> {
    const contact = this.contacts.get(contactId);
    if (contact) {
      // In a real scenario, a contact might have multiple emails.
      // Here, we'll just add a new property or overwrite for simplicity.
      // Let's assume we want to store multiple emails in an array.
      if (!contact.personalInfo.email.includes(email)) {
        // This assumes email is a string, but if we want multiple, it should be an array.
        // Let's adjust the logic slightly. For now, let's just update the main email
        // and add an `additionalEmails` property.
        if (!contact.personalInfo.additionalEmails) {
          contact.personalInfo.additionalEmails = [];
        }
        contact.personalInfo.additionalEmails.push(email);
        contact.markAsModified();
      }
    }
  }
} 