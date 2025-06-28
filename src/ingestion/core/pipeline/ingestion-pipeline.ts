/**
 * Unified Ingestion Pipeline
 * Central orchestrator for all data source processing
 */

import { singleton } from 'tsyringe';
import { DataSource, SourceType } from '../types/data-source.interface';
import { IngestionPipeline as IPipeline, ProcessingResult, PipelineMetrics } from '../types/pipeline.interface';
import { NormalizedData } from '../types/normalized-data.interface';

@singleton()
export class IngestionPipeline implements IPipeline {
  readonly id: string;
  readonly type: string;
  private static counter = 0;

  constructor() {
    // Generate unique ID using counter + timestamp for uniqueness
    IngestionPipeline.counter++;
    this.id = `pipeline-${Date.now()}-${IngestionPipeline.counter}`;
    this.type = 'unified';
  }

  /**
   * Process any data source through the unified pipeline
   */
  async process(source: DataSource): Promise<ProcessingResult> {
    const startTime = Date.now();
    console.log(`🚀 Starting unified pipeline for source: ${source.id}`);

    try {
      await source.connect();
      
      let itemsProcessed = 0;
      let itemsSucceeded = 0;
      let itemsFailed = 0;
      let entitiesCreated = 0;
      let relationshipsCreated = 0;
      const errors: any[] = [];

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
            console.log(`   ✅ Processed item ${itemsProcessed}`);
            
          } catch (error) {
            itemsFailed++;
            errors.push({
              item: `item-${itemsProcessed}`,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              recoverable: true
            });
            console.error(`   ❌ Failed to process item ${itemsProcessed}:`, error);
          }
        }
      } catch (sourceError) {
        // Handle source-level errors (like fetch failures)
        console.error(`💥 Source fetch error for ${source.id}:`, sourceError);
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
        console.warn(`⚠️ Disconnect error for source ${source.id}:`, disconnectError);
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
      console.error(`💥 Pipeline failed for source ${source.id}:`, error);
      throw error;
    }
  }

  /**
   * Get pipeline metrics
   */
  monitor(): PipelineMetrics {
    // TODO: Implement real metrics collection
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
    console.log('🛑 Stopping unified pipeline...');
    // TODO: Implement graceful shutdown
  }

  /**
   * Normalize raw data to unified format
   */
  private async normalizeData(rawData: any, sourceType: SourceType): Promise<NormalizedData> {
    // TODO: Implement normalization based on source type
    return {
      id: `${sourceType}-${Date.now()}`,
      sourceType,
      sourceId: 'temp',
      content: {
        body: rawData.toString(),
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
  private async extractEntities(data: NormalizedData): Promise<any> {
    // TODO: Use unified entity extractor
    return {
      entities: [],
      relationships: []
    };
  }

  /**
   * Store data in knowledge graph
   */
  private async storeData(data: NormalizedData, extraction: any): Promise<void> {
    // TODO: Use unified storage manager
    console.log(`💾 Storing data for ${data.id}`);
  }
}
