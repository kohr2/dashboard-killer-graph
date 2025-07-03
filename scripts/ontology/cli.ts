import { OntologySource, Entity, Relationship } from './ontology-source';
import { Config, validateConfig } from './config';
import { OntologyExtractor } from './extractor';
import { OntologyMerger } from './merger';

interface ProcessingResult {
  success: boolean;
  error?: string;
  sourceOntology?: {
    entities: Entity[];
    relationships: Relationship[];
  };
  finalOntology?: {
    entities: Record<string, Entity>;
    relationships: Record<string, Relationship>;
  };
  metadata?: {
    sourceUrl: string;
    extractionDate: string;
    sourceVersion: string;
    entityCount: number;
    relationshipCount: number;
  };
}

export class OntologyProcessor {
  constructor(private sources: OntologySource[]) {}

  async processOntology(config: Config): Promise<ProcessingResult> {
    try {
      // Validate config
      const validation = validateConfig(config);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid config: ${validation.errors.join(', ')}`
        };
      }

      // Find appropriate source handler
      const source = this.findSource(config.source.url);
      if (!source) {
        return {
          success: false,
          error: `No source handler found for URL: ${config.source.url}`
        };
      }

      // Extract from source
      const extractor = new OntologyExtractor(source);
      const extractionResult = await extractor.extract(config);

      // Convert arrays to records for merging
      const sourceEntities: Record<string, Entity> = {};
      const sourceRelationships: Record<string, Relationship> = {};

      for (const entity of extractionResult.entities) {
        sourceEntities[entity.name] = entity;
      }

      for (const relationship of extractionResult.relationships) {
        sourceRelationships[relationship.name] = relationship;
      }

      // Apply overrides
      const merger = new OntologyMerger();
      const finalOntology = await merger.merge(
        { entities: sourceEntities, relationships: sourceRelationships },
        config.overrides
      );

      return {
        success: true,
        sourceOntology: {
          entities: extractionResult.entities,
          relationships: extractionResult.relationships
        },
        finalOntology,
        metadata: extractionResult.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private findSource(url: string): OntologySource | null {
    for (const source of this.sources) {
      if (source.canHandle(url)) {
        return source;
      }
    }
    return null;
  }
} 