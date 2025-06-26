// Base service for entity extraction

export interface ExtractedEntity {
  value: string;
  type: string;
  confidence: number;
  source?: string;
  metadata?: Record<string, any>;
}

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  entityCount: number;
  language: string;
  processingTimeMs: number;
  modelUsed?: string;
  metadata?: Record<string, any>;
}

export abstract class EntityExtractionService {
  abstract extractEntities(text: string, options?: any): Promise<EntityExtractionResult>;
}
