// In-Memory Communication Repository Implementation
// Provides in-memory storage for testing and development

import { Communication, CommunicationType, CommunicationStatus } from '../../domain/entities/communication';
import { CommunicationRepository, PaginationOptions } from '../../domain/repositories/communication-repository';

export class InMemoryCommunicationRepository implements CommunicationRepository {
  private communications: Map<string, Communication> = new Map();

  async save(communication: Communication): Promise<Communication> {
    this.communications.set(communication.getId(), communication);
    return communication;
  }

  async findById(id: string): Promise<Communication | undefined> {
    return this.communications.get(id);
  }

  async findAll(options?: PaginationOptions): Promise<Communication[]> {
    const allCommunications = Array.from(this.communications.values());
    
    if (!options) {
      return allCommunications;
    }

    const { page, limit } = options;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return allCommunications.slice(startIndex, endIndex);
  }

  async delete(id: string): Promise<boolean> {
    return this.communications.delete(id);
  }

  async findByContactId(contactId: string): Promise<Communication[]> {
    const results: Communication[] = [];

    for (const communication of this.communications.values()) {
      if (communication.getContactId() === contactId) {
        results.push(communication);
      }
    }

    return results;
  }

  async findByType(type: CommunicationType): Promise<Communication[]> {
    const results: Communication[] = [];

    for (const communication of this.communications.values()) {
      if (communication.getType() === type) {
        results.push(communication);
      }
    }

    return results;
  }

  async findByStatus(status: CommunicationStatus): Promise<Communication[]> {
    const results: Communication[] = [];

    for (const communication of this.communications.values()) {
      if (communication.getStatus() === status) {
        results.push(communication);
      }
    }

    return results;
  }

  async search(query: string): Promise<Communication[]> {
    const searchTerm = query.toLowerCase();
    const results: Communication[] = [];

    for (const communication of this.communications.values()) {
      const subject = communication.getSubject()?.toLowerCase() || '';
      const content = communication.getContent()?.toLowerCase() || '';
      
      if (subject.includes(searchTerm) || content.includes(searchTerm)) {
        results.push(communication);
      }
    }

    return results;
  }

  async count(): Promise<number> {
    return this.communications.size;
  }

  async exists(id: string): Promise<boolean> {
    return this.communications.has(id);
  }
} 