// In-Memory Communication Repository Implementation
// Provides in-memory storage for testing and development

import { CommunicationDTO } from '@generated/crm/generated/CommunicationDTO';
import { CommunicationRepository } from '@crm/domain/repositories/communication-repository';
import { SpacyExtractedEntity } from '@crm/application/services/spacy-entity-extraction.service';

export class InMemoryCommunicationRepository
  implements CommunicationRepository
{
  private communications: Map<string, CommunicationDTO> = new Map();

  async save(communication: CommunicationDTO): Promise<CommunicationDTO> {
    this.communications.set(communication.id, communication);
    return communication;
  }

  async findById(id: string): Promise<CommunicationDTO | null> {
    return this.communications.get(id) || null;
  }

  async findAll(): Promise<CommunicationDTO[]> {
    return Array.from(this.communications.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.communications.delete(id);
  }

  async findByContactId(contactId: string): Promise<CommunicationDTO[]> {
    const results: CommunicationDTO[] = [];
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

  async findByType(type: string): Promise<CommunicationDTO[]> {
    const results: CommunicationDTO[] = [];
    for (const communication of this.communications.values()) {
      if (communication.type === type) {
        results.push(communication);
      }
    }
    return results;
  }

  async findByStatus(status: string): Promise<CommunicationDTO[]> {
    const results: CommunicationDTO[] = [];
    for (const communication of this.communications.values()) {
      if (communication.status === status) {
        results.push(communication);
      }
    }
    return results;
  }

  async search(query: string): Promise<CommunicationDTO[]> {
    const searchTerm = query.toLowerCase();
    const results: CommunicationDTO[] = [];
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
      const linkedEntities = entities.map(e => `${e.type}:${e.value}`).join(',');
      const updatedCommunication: CommunicationDTO = {
        ...communication,
        metadata: linkedEntities,
        updatedAt: new Date().toISOString(),
      };
      await this.save(updatedCommunication);
    }
  }

  async updateProperties(id: string, properties: Record<string, any>): Promise<void> {
    const communication = await this.findById(id);
    if (communication) {
      const updatedCommunication: CommunicationDTO = {
        ...communication,
        ...properties,
        updatedAt: new Date().toISOString(),
      };
      await this.save(updatedCommunication);
    }
    return Promise.resolve();
  }
} 