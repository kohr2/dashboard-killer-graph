import { Communication } from '../entities/communication';

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface CommunicationRepository {
    save(communication: Communication): Promise<Communication>;
    findById(id: string): Promise<Communication | undefined>;
    findAll(options?: PaginationOptions): Promise<Communication[]>;
    // ... autres signatures de méthodes si nécessaire
}
