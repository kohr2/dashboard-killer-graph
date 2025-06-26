import { Communication, CommunicationType, CommunicationStatus } from '../entities/communication';
import { SpacyExtractedEntity } from '../../application/services/spacy-entity-extraction.service';

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface CommunicationRepository {
    save(communication: Communication): Promise<Communication>;
    findById(id: string): Promise<Communication | null>;
    findAll(options?: PaginationOptions): Promise<Communication[]>;
    delete(id: string): Promise<boolean>;
    findByContactId(contactId: string): Promise<Communication[]>;
    findByType(type: CommunicationType): Promise<Communication[]>;
    findByStatus(status: CommunicationStatus): Promise<Communication[]>;
    search(query: string): Promise<Communication[]>;
    count(): Promise<number>;
    exists(id: string): Promise<boolean>;
    linkEntitiesToCommunication(
        communicationId: string,
        entities: SpacyExtractedEntity[],
    ): Promise<void>;
}
