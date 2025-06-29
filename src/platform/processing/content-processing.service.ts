import { singleton, inject } from 'tsyringe';
import axios from 'axios';
import { logger } from '@shared/utils/logger';
import { EnrichmentOrchestratorService } from '@platform/enrichment';
import { Organization } from '@crm/domain/entities/organization';

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

@singleton()
export class ContentProcessingService {
  private nlpServiceUrl: string;

  constructor(
    @inject(EnrichmentOrchestratorService) private enrichmentOrchestrator: EnrichmentOrchestratorService
  ) {
    this.nlpServiceUrl = 'http://127.0.0.1:8000';
  }

  public async processContentBatch(
    contents: string[],
  ): Promise<Array<{
    entities: IngestionEntity[];
    relationships: unknown[];
  }>> {
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
            const org = new Organization(entity.id, entity.name);
            const enrichedOrg = await this.enrichmentOrchestrator.enrich(org);
            if (enrichedOrg) {
              const finalEntity = { ...entity, ...enrichedOrg, properties: { ...entity.properties, ...enrichedOrg.enrichedData } };
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
} 