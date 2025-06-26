// In-Memory Communication Repository Implementation
// Provides in-memory storage for testing and development

import {
  Communication,
  CommunicationType,
  CommunicationStatus,
} from '@crm/domain/entities/communication';
import { CommunicationRepository } from '@crm/domain/repositories/communication-repository';
import { SpacyExtractedEntity } from '@crm/application/services/spacy-entity-extraction.service';

export class InMemoryCommunicationRepository
  implements CommunicationRepository
{
  private communications: Map<string, Communication> = new Map();

  async save(communication: Communication): Promise<Communication> {
    this.communications.set(communication.id, communication);
    return communication;
  }

  async findById(id: string): Promise<Communication | null> {
    return this.communications.get(id) || null;
  }

  async findAll(): Promise<Communication[]> {
    return Array.from(this.communications.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.communications.delete(id);
  }

  async findByContactId(contactId: string): Promise<Communication[]> {
    const results: Communication[] = [];
    for (const communication of this.communications.values()) {
      if (
        communication.recipients.includes(contactId) ||
        communication.sender === contactId
      ) {
        results.push(communication);
      }
    }
    return results;
  }

  async findByType(type: CommunicationType): Promise<Communication[]> {
    const results: Communication[] = [];
    for (const communication of this.communications.values()) {
      if (communication.type === type) {
        results.push(communication);
      }
    }
    return results;
  }

  async findByStatus(status: CommunicationStatus): Promise<Communication[]> {
    const results: Communication[] = [];
    for (const communication of this.communications.values()) {
      if (communication.status === status) {
        results.push(communication);
      }
    }
    return results;
  }

  async search(query: string): Promise<Communication[]> {
    const searchTerm = query.toLowerCase();
    const results: Communication[] = [];
    for (const communication of this.communications.values()) {
      const subject = communication.subject?.toLowerCase() || '';
      const body = communication.body?.toLowerCase() || '';
      if (subject.includes(searchTerm) || body.includes(searchTerm)) {
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

  async linkEntitiesToCommunication(
    communicationId: string,
    entities: SpacyExtractedEntity[],
  ): Promise<void> {
    const communication = await this.findById(communicationId);
    if (communication) {
      if (!communication.metadata) {
        communication.metadata = {};
      }
      communication.metadata.linkedEntities = entities.map(e => `${e.type}:${e.value}`);
      await this.save(communication);
    }
  }

  async updateProperties(id: string, properties: Record<string, any>): Promise<void> {
    const communication = await this.findById(id);
    if (communication) {
      if (!communication.metadata) {
        communication.metadata = {};
      }
      Object.assign(communication.metadata, properties);
      await this.save(communication);
    }
    return Promise.resolve();
  }
} 