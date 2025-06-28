import { singleton } from 'tsyringe';
import axios from 'axios';

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

@singleton()
export class ContentProcessingService {
  private nlpServiceUrl: string;

  constructor() {
    this.nlpServiceUrl = 'http://127.0.0.1:8000';
  }

  public async processContentBatch(
    contents: string[],
  ): Promise<Array<{
    entities: any[];
    relationships: any[];
  }>> {
    try {
      console.log(`   🧠 Calling batch /extract-graph endpoint for ${contents.length} documents...`);
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

      console.log(`      -> LLM extracted graphs for ${graphs?.length ?? 0} documents.`);
      
      const allEntities: any[] = [];
      const documentEntityMap: Map<number, any[]> = new Map();

      if (!Array.isArray(graphs)) {
        console.error('   ❌ NLP service did not return a valid array of graphs. Original Response:', batchResponse.data);
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
      
      if (allEntities.length > 0) {
        const entityNames = allEntities.map(e => e.name);
        console.log(`   ↪️ Generating embeddings for ${entityNames.length} total entities...`);
        try {
          const embeddingResponse = await axios.post<{ embeddings: number[][] }>(
            `${this.nlpServiceUrl}/embed`,
            { texts: entityNames },
            { timeout: 120000 }
          );
          const { embeddings } = embeddingResponse.data;
          
          if (embeddings && embeddings.length === allEntities.length) {
            allEntities.forEach((entity, index) => {
              entity.embedding = embeddings[index];
            });
            console.log(`      -> All embeddings attached successfully.`);
          }
        } catch (embeddingError) {
          console.error('   ❌ Error generating batch entity embeddings:', embeddingError);
        }
      }

      if (Array.isArray(graphs)) {
        const finalResults = graphs.map((graph, docIndex) => {
          const entities = documentEntityMap.get(docIndex) || [];
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
        console.error('   ❌ Error calling batch NLP graph service:', error.response?.data?.detail || error.message);
      } else {
        console.error('   ❌ An unexpected error occurred during batch NLP processing:', error);
      }
      return [];
    }
  }
} 