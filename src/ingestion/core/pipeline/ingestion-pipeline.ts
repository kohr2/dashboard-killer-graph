/**
 * Unified Ingestion Pipeline
 * Central orchestrator for all data source processing
 */

import { singleton, inject } from 'tsyringe';
import { DataSource, SourceType } from '../types/data-source.interface';
import { IngestionPipeline as IPipeline, ProcessingResult, PipelineMetrics, ProcessingError } from '../types/pipeline.interface';
import { NormalizedData } from '../types/normalized-data.interface';
import { logger } from '@shared/utils/logger';
import type { EntityExtractor, EntityExtraction } from '../../intelligence/entity-extractor.interface';

@singleton()
export class IngestionPipeline implements IPipeline {
  readonly id: string;
  readonly type: string;
  private static counter = 0;

  constructor(
    @inject('EntityExtractor') private extractor?: EntityExtractor,
  ) {
    // Generate unique ID using counter + timestamp for uniqueness
    IngestionPipeline.counter++;
    this.id = `pipeline-${Date.now()}-${IngestionPipeline.counter}`;
    this.type = 'unified';

    // fallback extractor if none provided
    if (!this.extractor) {
      this.extractor = {
        extract: async () => ({ entities: [], relationships: [] }),
      };
    }
  }

  /**
   * Process any data source through the unified pipeline
   */
  async process(source: DataSource): Promise<ProcessingResult> {
    const startTime = Date.now();
    logger.info(`🚀 Starting unified pipeline for source: ${source.id}`);

    try {
      await source.connect();
      
      let itemsProcessed = 0;
      let itemsSucceeded = 0;
      let itemsFailed = 0;
      let entitiesCreated = 0;
      let relationshipsCreated = 0;
      const errors: ProcessingError[] = [];

      // Process each item from the source
      try {
        for await (const rawData of source.fetch()) {
          itemsProcessed++;
          
          try {
            // 1. Normalize data
            const normalized = await this.normalizeData(rawData, source.type);
            
            // 2. Extract entities
            const extraction = await this.extractEntities(normalized);
            entitiesCreated += extraction.entities.length;
            relationshipsCreated += extraction.relationships.length;
            
            // 3. Store in knowledge graph
            await this.storeData(normalized, extraction);
            
            itemsSucceeded++;
            logger.info(`   ✅ Processed item ${itemsProcessed}`);
            
          } catch (error) {
            itemsFailed++;
            errors.push({
              item: `item-${itemsProcessed}`,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              recoverable: true
            });
            logger.error(`   ❌ Failed to process item ${itemsProcessed}:`, error);
          }
        }
      } catch (sourceError) {
        // Handle source-level errors (like fetch failures)
        logger.error(`💥 Source fetch error for ${source.id}:`, sourceError);
        // If we processed at least one item successfully, continue
        if (itemsSucceeded === 0) {
          throw sourceError; // Re-throw if no items were processed successfully
        }
      }

      // Attempt to disconnect gracefully
      try {
        await source.disconnect();
      } catch (disconnectError) {
        // Log disconnect errors but don't fail the pipeline
        logger.warn(`⚠️ Disconnect error for source ${source.id}:`, disconnectError);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: itemsSucceeded > 0,
        sourceId: source.id,
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        entitiesCreated,
        relationshipsCreated,
        duration,
        errors,
        metadata: {
          sourceType: source.type,
          pipelineId: this.id
        }
      };

    } catch (error) {
      logger.error(`💥 Pipeline failed for source ${source.id}:`, error);
      throw error;
    }
  }

  /**
   * Get pipeline metrics
   */
  monitor(): PipelineMetrics {
    // Implementation pending real metrics collection
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      lastRun: new Date(),
      status: 'idle'
    };
  }

  /**
   * Stop the pipeline
   */
  async stop(): Promise<void> {
    logger.info('🛑 Stopping unified pipeline...');
    // Implementation pending graceful shutdown
  }

  /**
   * Normalize raw data to unified format
   */
  private async normalizeData(rawData: unknown, sourceType: SourceType): Promise<NormalizedData> {
    // Implementation pending normalization based on source type
    return {
      id: `${sourceType}-${Date.now()}`,
      sourceType,
      sourceId: 'temp',
      content: {
        body: String(rawData),
      },
      metadata: {
        timestamp: new Date(),
      },
      raw: rawData
    };
  }

  /**
   * Extract entities from normalized data
   */
  private async extractEntities(data: NormalizedData): Promise<EntityExtraction> {
    try {
      const text = data.content.body?.toString() || '';
      return await this.extractor!.extract(text);
    } catch (err) {
      logger.error('Entity extraction error:', err);
      return { entities: [], relationships: [] };
    }
  }

  /**
   * Store data in knowledge graph
   */
  private async storeData(data: NormalizedData, extraction: EntityExtraction): Promise<void> {
    // TODO: Use unified storage manager
    logger.info(`💾 Storing data for ${data.id}`);
  }
}
