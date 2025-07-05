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
          const desc = typeof rel.description === 'string' ? rel.description : rel.description?._;
          if (desc) relationshipDescriptions[name] = desc;
        }
      } else {
        for (const [key, rel] of Object.entries(ont.relationships as Record<string, any>)) {
          const name = rel.name || key;
          relationshipTypes.add(name);
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
      const payload = buildOntologySyncPayload(ontologyService);
      try {
        logger.info('   🔄 Syncing ontology schema with NLP service...');
        await axios.post(`${this.nlpServiceUrl}/ontologies`, payload, { timeout: 30000 });
        this.ontologySynced = true;
        logger.info('      -> Ontology schema synced');
      } catch (syncErr) {
        logger.warn('      ⚠️  Failed to sync ontology schema with NLP service:', (syncErr as any).message);
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
      for(const entity of allEntities) {
        if (entity.type === 'Organization') {
          logger.info(`      -> Auto-enriching Organization: ${entity.name}`);
          try {
            const orgDTO = {
              type: 'Organization',
              name: entity.name,
              id: entity.id,
              label: entity.type,
              properties: entity.properties || {}
            };
            const enrichedOrg = await this.enrichmentOrchestrator.enrich(orgDTO);
            if (enrichedOrg) {
              const finalEntity = { 
                ...entity, 
                ...enrichedOrg, 
                properties: { 
                  ...entity.properties, 
                  ...enrichedOrg 
                } 
              };
              enrichedEntities.push(finalEntity);
            } else {
              enrichedEntities.push(entity);
            }
          } catch (enrichError: any) {
            logger.error(`      ❌ Error enriching ${entity.name}:`, enrichError.message);
            enrichedEntities.push(entity); // Keep original entity if enrichment fails
          }
        } else {
          enrichedEntities.push(entity);
        }
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
   * Falls back to `Thing` if no match is found.
   */
  public static normaliseEntityType(rawType: string): string {
    const ontologyService = container.resolve(OntologyService);
    const validTypes = ontologyService.getAllEntityTypes();

    if (validTypes.includes(rawType)) {
      return rawType;
    }

    const cleanedRaw = rawType.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = validTypes.find(t => t.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanedRaw);

    return match || 'Thing';
  }
} 