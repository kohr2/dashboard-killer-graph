import { OntologySource, ExtractionResult } from './ontology-source';
import { Config } from './config';

export class OntologyExtractor {
  constructor(private source: OntologySource) {}

  async extract(config: Config): Promise<ExtractionResult> {
    const content = await this.source.fetch(config.source.url);
    const parsed = await this.source.parse(content);
    const entities = await this.source.extractEntities(config.extraction.entities, parsed);
    const relationships = await this.source.extractRelationships(config.extraction.relationships, parsed);
    const extractionDate = new Date().toISOString();
    return {
      entities,
      relationships,
      ignoredEntities: parsed.ignoredEntities,
      ignoredRelationships: parsed.ignoredRelationships,
      metadata: {
        sourceUrl: config.source.url,
        extractionDate,
        sourceVersion: config.source.version,
        entityCount: entities.length,
        relationshipCount: relationships.length
      }
    };
  }
} 