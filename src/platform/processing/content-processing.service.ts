import axios from 'axios';
import { logger } from '@common/utils/logger';
import { EnrichmentOrchestratorService } from '@platform/enrichment';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';

// ---------------- Ontology sync payload ----------------
export interface OntologySyncPayload {
  ontologyName: string | undefined; // can be undefined for multi-ontology mode
  entity_types: string[];
  relationship_types: string[];
  property_types: string[];
  entity_descriptions?: Record<string, string>;
  relationship_descriptions?: Record<string, string>;
  relationship_patterns?: string[];
}

/**
 * Build the payload that will be POST-ed to the NLP micro-service so it can
 * understand the currently active ontology / ontologies. Includes:
 *   • flat lists of entity / relationship / property types (current behaviour)
 *   • optional description maps so the LLM gains semantic context.
 */
export function buildOntologySyncPayload(
  ontologyService: OntologyService,
  ontologyName?: string,
): OntologySyncPayload {
  const allOntologies = ontologyService.getAllOntologies();

  const entityDescriptions: Record<string, string> = {};
  const relationshipDescriptions: Record<string, string> = {};
  const entityTypes = new Set<string>();
  const propertyTypes = new Set<string>();
  const relationshipTypes = new Set<string>();
  const relationshipPatterns = new Set<string>();

  for (const ont of allOntologies) {
    // Filter if the caller asked for a single ontology name
    if (ontologyName && ont.name.toLowerCase() !== ontologyName.toLowerCase()) {
      continue;
    }

    if (Array.isArray(ont.entities)) {
      for (const ent of ont.entities as any[]) {
        const name = ent.name || ent.label || ent.id;
        if (!name) continue;
        entityTypes.add(name);
        if (ent.isProperty) propertyTypes.add(name);
        const desc = typeof ent.description === 'string' ? ent.description : ent.description?._;
        if (desc) entityDescriptions[name] = desc;
      }
    } else {
      for (const [key, ent] of Object.entries(ont.entities as Record<string, any>)) {
        const name = ent.name || key;
        entityTypes.add(name);
        if (ent.isProperty) propertyTypes.add(name);
        const desc = typeof ent.description === 'string' ? ent.description : ent.description?._;
        if (desc) entityDescriptions[name] = desc;
      }
    }

    if (ont.relationships) {
      if (Array.isArray(ont.relationships)) {
        for (const rel of ont.relationships as any[]) {
          const name = rel.name || rel.label || rel.id;
          if (!name) continue;
          relationshipTypes.add(name);
          const source = Array.isArray(rel.domain) ? rel.domain[0] : rel.domain || rel.source || 'UnknownSource';
          const target = Array.isArray(rel.range) ? rel.range[0] : rel.range || rel.target || 'UnknownTarget';
          if (source && target) {
            relationshipPatterns.add(`${source}-${name}->${target}`);
          }
          const desc = typeof rel.description === 'string' ? rel.description : rel.description?._;
          if (desc) relationshipDescriptions[name] = desc;
        }
      } else {
        for (const [key, rel] of Object.entries(ont.relationships as Record<string, any>)) {
          const name = rel.name || key;
          relationshipTypes.add(name);
          const source = Array.isArray(rel.domain) ? rel.domain[0] : rel.domain || rel.source || 'UnknownSource';
          const target = Array.isArray(rel.range) ? rel.range[0] : rel.range || rel.target || 'UnknownTarget';
          if (source && target) {
            relationshipPatterns.add(`${source}-${name}->${target}`);
          }
          const desc = typeof rel.description === 'string' ? rel.description : rel.description?._;
          if (desc) relationshipDescriptions[name] = desc;
        }
      }
    }
  }

  return {
    ontologyName,
    entity_types: Array.from(entityTypes),
    relationship_types: Array.from(relationshipTypes),
    property_types: Array.from(propertyTypes),
    entity_descriptions: Object.keys(entityDescriptions).length ? entityDescriptions : undefined,
    relationship_descriptions: Object.keys(relationshipDescriptions).length ? relationshipDescriptions : undefined,
    relationship_patterns: relationshipPatterns.size ? Array.from(relationshipPatterns) : undefined,
  };
}

export interface CompactOntologySyncPayload {
  ontologyName: string | undefined;
  compact_ontology: {
    e: string[];
    r: [string, string, string][];
  };
}

export function buildCompactOntologySyncPayload(
  ontologyService: OntologyService,
  ontologyName?: string,
): CompactOntologySyncPayload {
  const allOntologies = ontologyService.getAllOntologies();

  const entityTypes = new Set<string>();
  const relationshipPatterns: [string, string, string][] = [];

  for (const ont of allOntologies) {
    // Filter if the caller asked for a single ontology name
    if (ontologyName && ont.name.toLowerCase() !== ontologyName.toLowerCase()) {
      continue;
    }

    if (Array.isArray(ont.entities)) {
      for (const ent of ont.entities as any[]) {
        const name = ent.name || ent.label || ent.id;
        if (!name) continue;
        // Skip generic entities
        if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(name)) continue;
        if (ent.isProperty) continue; // Skip property types
        entityTypes.add(name);
      }
    } else {
      for (const [key, ent] of Object.entries(ont.entities as Record<string, any>)) {
        const name = ent.name || key;
        // Skip generic entities
        if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(name)) continue;
        if (ent.isProperty) continue; // Skip property types
        entityTypes.add(name);
      }
    }

    if (ont.relationships) {
      if (Array.isArray(ont.relationships)) {
        for (const rel of ont.relationships as any[]) {
          const name = rel.name || rel.label || rel.id;
          if (!name) continue;
          
          const source = Array.isArray(rel.domain) ? rel.domain[0] : rel.domain || rel.source || 'UnknownSource';
          const target = Array.isArray(rel.range) ? rel.range[0] : rel.range || rel.target || 'UnknownTarget';
          
          // Skip generic relationships
          if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(source) || 
              ['Thing', 'Entity', 'UnrecognizedEntity'].includes(target)) continue;
          if (source === 'Entity' && target === 'Entity') continue;
          if (source === target) continue; // Skip self-referential
          
          // Skip very generic relationship types
          const genericTypes = ['hasProperty', 'hasAttribute', 'hasValue', 'hasType', 'hasName', 'hasId'];
          if (genericTypes.includes(name)) continue;
          
          if (source && target && name) {
            relationshipPatterns.push([source, name, target]);
          }
        }
      } else {
        for (const [key, rel] of Object.entries(ont.relationships as Record<string, any>)) {
          const name = rel.name || key;
          
          const source = Array.isArray(rel.domain) ? rel.domain[0] : rel.domain || rel.source || 'UnknownSource';
          const target = Array.isArray(rel.range) ? rel.range[0] : rel.range || rel.target || 'UnknownTarget';
          
          // Skip generic relationships
          if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(source) || 
              ['Thing', 'Entity', 'UnrecognizedEntity'].includes(target)) continue;
          if (source === 'Entity' && target === 'Entity') continue;
          if (source === target) continue; // Skip self-referential
          
          // Skip very generic relationship types
          const genericTypes = ['hasProperty', 'hasAttribute', 'hasValue', 'hasType', 'hasName', 'hasId'];
          if (genericTypes.includes(name)) continue;
          
          if (source && target && name) {
            relationshipPatterns.push([source, name, target]);
          }
        }
      }
    }
  }

  // Sort entities and relationship patterns alphabetically for deterministic output
  const sortedEntities = Array.from(entityTypes).sort((a, b) => a.localeCompare(b));

  relationshipPatterns.sort((a, b) => {
    if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
    if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
    return a[2].localeCompare(b[2]);
  });

  return {
    ontologyName,
    compact_ontology: {
      e: sortedEntities,
      r: relationshipPatterns
    }
  };
}

export interface LlmGraphEntity {
  value: string;
  type: string;
  properties: Record<string, any>;
}

export interface LlmGraphRelationship {
  source: string;
  target: string;
  type: string;
}

// Define the response structure here to avoid cross-dependencies
export interface LlmGraphResponse {
  entities: LlmGraphEntity[];
  relationships: LlmGraphRelationship[];
  refinement_info: string;
}

interface IngestionEntity {
  id: string;
  name: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  originalDocIndex: number;
  embedding?: number[];
}

export class ContentProcessingService {
  private nlpServiceUrl: string;
  private enrichmentOrchestrator: EnrichmentOrchestratorService;
  private ontologySynced = false;

  constructor(
    enrichmentOrchestrator: EnrichmentOrchestratorService = new EnrichmentOrchestratorService(),
  ) {
    this.enrichmentOrchestrator = enrichmentOrchestrator;
    this.nlpServiceUrl = 'http://127.0.0.1:8000';
  }

  public async processContentBatch(
    contents: string[],
  ): Promise<Array<{
    entities: IngestionEntity[];
    relationships: unknown[];
  }>> {
    // --- One-time ontology synchronisation with NLP service ---
    if (!this.ontologySynced) {
      const ontologyService = container.resolve(OntologyService);
      const payload = buildCompactOntologySyncPayload(ontologyService);
      try {
        logger.info('   🔄 Syncing compact ontology schema with NLP service...');
        await axios.post(`${this.nlpServiceUrl}/ontologies`, payload, { timeout: 30000 });
        this.ontologySynced = true;
        logger.info('      -> Compact ontology schema synced');
      } catch (syncErr) {
        logger.warn('      ⚠️  Failed to sync compact ontology schema with NLP service:', (syncErr as any).message);
      }
    }

    try {
      logger.info(`   🧠 Calling batch /extract-graph endpoint for ${contents.length} documents...`);
      const batchResponse = await axios.post<LlmGraphResponse[]>(
        `${this.nlpServiceUrl}/batch-extract-graph`,
        { texts: contents },
        { timeout: 360000 } // 360-second timeout for the full batch
      );

      let graphs = batchResponse.data as any;

      // Handle cases where the data is nested under a 'graphs' key
      if (graphs && typeof graphs === 'object' && !Array.isArray(graphs) && 'graphs' in graphs && Array.isArray(graphs.graphs)) {
        graphs = graphs.graphs;
      }

      logger.info(`      -> LLM extracted graphs for ${graphs?.length ?? 0} documents.`);
      
      const allEntities: IngestionEntity[] = [];
      const documentEntityMap: Map<number, any[]> = new Map();

      if (!Array.isArray(graphs)) {
        logger.error('   ❌ NLP service did not return a valid array of graphs. Original Response:', batchResponse.data);
        return [];
      }

      graphs.forEach((graph, docIndex) => {
        const docEntities = (graph.entities || []).map((entity: LlmGraphEntity) => ({
              id: entity.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, ''),
              name: entity.value,
              type: entity.type,
              label: entity.type,
              properties: entity.properties || {},
              originalDocIndex: docIndex 
            }));
        allEntities.push(...docEntities);
        documentEntityMap.set(docIndex, docEntities);
      });
      
      // --- Automatic Enrichment Step ---
      const enrichedEntities: IngestionEntity[] = [];
      const ontologyService = container.resolve(OntologyService);

      for (const entity of allEntities) {
        const dto = {
          ...entity,
          label: entity.type,
        } as any;

        const serviceName = ontologyService.getEnrichmentServiceName(dto);
        if (serviceName) {
          logger.info(`      -> Auto-enriching ${entity.type} '${entity.name}' via ${serviceName}`);
          try {
            const service = this.enrichmentOrchestrator.getService(serviceName);
            if (service) {
              const result = await service.enrich(dto);
              
              // Handle mixed return types from enrichment services
              if (result && typeof result === 'object') {
                // Check if it's an EnrichmentResult format
                if ('success' in result && result.success && 'data' in result) {
                  const finalEntity = {
                    ...entity,
                    properties: {
                      ...entity.properties,
                      ...(result.data || {}),
                    },
                  } as any;
                  enrichedEntities.push(finalEntity);
                  continue;
                } else if ('id' in result || 'name' in result || 'type' in result) {
                  // It's an enriched entity (legacy format)
                  const finalEntity = {
                    ...entity,
                    properties: {
                      ...entity.properties,
                      ...result,
                    },
                  } as any;
                  enrichedEntities.push(finalEntity);
                  continue;
                }
                // For empty objects {}, we don't add enrichment data
              }
            }
          } catch (err: any) {
            logger.error(`      ❌ Error enriching ${entity.name} with ${serviceName}:`, err.message);
          }
        }
        // Fallback: push original entity unchanged
        enrichedEntities.push(entity);
      }
      
      if (enrichedEntities.length > 0) {
        const entityNames = enrichedEntities.map(e => e.name);
        logger.info(`   ↪️ Generating embeddings for ${entityNames.length} total entities...`);
        try {
          const embeddingResponse = await axios.post<{ embeddings: number[][] }>(
            `${this.nlpServiceUrl}/embed`,
            { texts: entityNames },
            { timeout: 120000 }
          );
          const { embeddings } = embeddingResponse.data;
          
          if (embeddings && embeddings.length === enrichedEntities.length) {
            enrichedEntities.forEach((entity, index) => {
              entity.embedding = embeddings[index];
            });
            logger.info(`      -> All embeddings attached successfully.`);
          }
        } catch (embeddingError) {
          logger.error('   ❌ Error generating batch entity embeddings:', embeddingError);
        }
      }

      if (Array.isArray(graphs)) {
        const finalResults = graphs.map((graph, docIndex) => {
          const entities = enrichedEntities.filter(e => e.originalDocIndex === docIndex);
          const entityIdMap = new Map(entities.map(e => [e.name, e.id]));
          
          const relationships = (graph.relationships || []).map((rel: LlmGraphRelationship) => ({
            source: entityIdMap.get(rel.source),
            target: entityIdMap.get(rel.target),
            type: rel.type
          })).filter((r: { source: string | undefined, target: string | undefined }) => r.source && r.target);

          return {
              entities,
              relationships
          };
        });

        return finalResults;
      }
      return [];

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('   ❌ Error calling batch NLP graph service:', error.response?.data?.detail || error.message);
      } else {
        logger.error('   ❌ An unexpected error occurred during batch NLP processing:', error);
      }
      return [];
    }
  }

  /**
   * Normalise a raw entity type emitted by the LLM to the canonical ontology entity name.
   * – Case-insensitive
   * – Ignores whitespace, dashes, underscores
   * Returns `undefined` if no match is found (previously "Thing").
   */
  public static normaliseEntityType(rawType: string): string | undefined {
    const ontologyService = container.resolve(OntologyService);
    const validTypes = ontologyService.getAllEntityTypes();

    if (validTypes.includes(rawType)) {
      return rawType;
    }

    const cleanedRaw = rawType.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = validTypes.find(t => t.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanedRaw);

    return match; // may be undefined
  }
} 