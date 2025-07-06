import { autoInjectable, inject } from 'tsyringe';
import { Neo4jConnection } from './neo4j-connection';
import { logger } from '@common/utils/logger';

export interface VectorSearchResult {
  node: Record<string, any>;
  score: number;
}

@autoInjectable()
export class VectorSearchService {
  constructor(@inject(Neo4jConnection) private readonly conn?: Neo4jConnection) {}

  /**
   * Generic vector similarity search.
   * @param label Node label to query index for (must have vector index <label>_embeddings)
   * @param embedding vector embedding (float32[])
   * @param topK number of nearest neighbours to retrieve (default 1)
   * @param threshold minimum score required to consider result a match
   */
  async findSimilarNode(
    label: string,
    embedding: number[],
    topK = 1,
    threshold = 0.9,
  ): Promise<VectorSearchResult | undefined> {
    if (!this.conn) throw new Error('VectorSearchService: Neo4jConnection not provided');
    const session = this.conn.getSession();
    const indexName = `${label.toLowerCase()}_embeddings`;
    try {
      const result = await session.run(
        `CALL db.index.vector.queryNodes($indexName, $topK, $embedding) YIELD node, score RETURN node, score`,
        { indexName, topK, embedding },
      );
      if (result.records.length === 0) return undefined;
      const best = result.records[0];
      const score: number = best.get('score');
      if (score < threshold) return undefined;
      return { node: best.get('node'), score };
    } catch (err: any) {
      if (err.code === 'Neo.ClientError.Procedure.ProcedureCallFailed') {
        logger.warn(`Vector search skipped – index '${indexName}' not found.`);
        return undefined;
      }
      logger.error('❌ Vector similarity search failed:', err);
      return undefined;
    } finally {
      await session.close();
    }
  }

  async findSimilarOrganization(
    embedding: number[],
    threshold = 0.9,
  ) {
    return this.findSimilarNode('Organization', embedding, 1, threshold);
  }
} 