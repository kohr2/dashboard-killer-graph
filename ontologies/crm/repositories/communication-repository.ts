import { CommunicationDTO } from '@generated/crm/generated/CommunicationDTO';
import { SpacyExtractedEntity } from '../../application/services/spacy-entity-extraction.service';

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface CommunicationRepository {
    save(communication: CommunicationDTO): Promise<CommunicationDTO>;
    updateProperties(id: string, properties: Record<string, any>): Promise<void>;
    findById(id: string): Promise<CommunicationDTO | null>;
    findAll(options?: PaginationOptions): Promise<CommunicationDTO[]>;
    delete(id: string): Promise<boolean>;
    findByContactId(contactId: string): Promise<CommunicationDTO[]>;
    findByType(type: string): Promise<CommunicationDTO[]>;
    findByStatus(status: string): Promise<CommunicationDTO[]>;
    search(query: string): Promise<CommunicationDTO[]>;
    count(): Promise<number>;
    exists(id: string): Promise<boolean>;
    linkEntitiesToCommunication(
        communicationId: string,
        entities: SpacyExtractedEntity[],
    ): Promise<void>;
}
