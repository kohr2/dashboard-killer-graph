/**
 * Unified Ingestion Pipeline
 * Central orchestrator for all data source processing
 */

// Removed tsyringe dependency for simplicity

import { DataSource, SourceType } from '../types/data-source.interface';
import { IngestionPipeline as IPipeline, ProcessingResult, PipelineMetrics, ProcessingError } from '../types/pipeline.interface';
import { NormalizedData } from '../types/normalized-data.interface';
import { logger } from '@shared/utils/logger';
import type { EntityExtractor, EntityExtraction } from '../../intelligence/entity-extractor.interface';
import { OntologyDrivenAdvancedGraphService } from '@platform/processing/ontology-driven-advanced-graph.service';
import { OntologyService } from '@platform/ontology/ontology.service';

export class IngestionPipeline implements IPipeline {
  readonly id: string;
  readonly type: string;
  private static counter = 0;

  constructor(
    private extractor: EntityExtractor = { extract: async () => ({ entities: [], relationships: [] }) },
    private advancedGraphService?: OntologyDrivenAdvancedGraphService,
    private ontologyService?: OntologyService,
  ) {
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
    logger.info(`🚀 Starting unified pipeline for source: ${source.id}`);

    try {
      await source.connect();
      
      let itemsProcessed = 0;
      let itemsSucceeded = 0;
      let itemsFailed = 0;
      let entitiesCreated = 0;
      let relationshipsCreated = 0;
      const errors: ProcessingError[] = [];
      const detectedOntologies = new Set<string>();

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
            
            // 3. Detect ontologies based on extracted entities
            const itemOntologies = this.detectOntologies(extraction.entities, normalized);
            itemOntologies.forEach(ontology => detectedOntologies.add(ontology));
            
            // 4. Store in knowledge graph
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

      // 5. Apply advanced relationships for detected ontologies
      if (this.advancedGraphService && itemsSucceeded > 0) {
        try {
          await this.applyAdvancedRelationships(detectedOntologies, source);
          logger.info(`🔗 Applied advanced relationships for ontologies: ${Array.from(detectedOntologies).join(', ')}`);
        } catch (error) {
          logger.warn(`⚠️ Failed to apply advanced relationships for source ${source.id}:`, error);
          // Don't fail the pipeline if advanced relationships fail
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
          pipelineId: this.id,
          detectedOntologies: Array.from(detectedOntologies)
        }
      };

    } catch (error) {
      logger.error(`💥 Pipeline failed for source ${source.id}:`, error);
      throw error;
    }
  }

  /**
   * Detect relevant ontologies based on extracted entities and content
   */
  private detectOntologies(entities: any[], normalizedData: NormalizedData): string[] {
    if (!this.ontologyService) {
      return this.getFallbackOntologies(normalizedData.sourceType);
    }

    try {
      const allOntologies = this.ontologyService.getAllOntologies();
      const detectedOntologies = new Set<string>();
      
      // Analyze entities to determine relevant ontologies
      for (const entity of entities) {
        const entityType = entity.type || entity.entityType;
        if (!entityType) continue;

        // Find ontologies that contain this entity type
        for (const ontology of allOntologies) {
          if (ontology.entities && ontology.entities[entityType]) {
            detectedOntologies.add(ontology.name);
          }
        }
      }

      // If no ontologies detected from entities, analyze content
      if (detectedOntologies.size === 0) {
        const contentOntologies = this.analyzeContentForOntologies(normalizedData, allOntologies);
        contentOntologies.forEach(ontology => detectedOntologies.add(ontology));
      }

      // If still no ontologies detected, use fallback
      if (detectedOntologies.size === 0) {
        return this.getFallbackOntologies(normalizedData.sourceType);
      }

      return Array.from(detectedOntologies);
    } catch (error) {
      logger.warn('Failed to detect ontologies, using fallback:', error);
      return this.getFallbackOntologies(normalizedData.sourceType);
    }
  }

  /**
   * Analyze content for ontology keywords and patterns
   */
  private analyzeContentForOntologies(normalizedData: NormalizedData, allOntologies: any[]): string[] {
    const content = normalizedData.content.body?.toString().toLowerCase() || '';
    const detectedOntologies = new Set<string>();

    // Define keyword patterns for each ontology
    const ontologyKeywords: Record<string, string[]> = {
      'financial': ['deal', 'investment', 'funding', 'series', 'round', 'investor', 'capital', 'valuation', 'revenue', 'profit'],
      'crm': ['contact', 'customer', 'client', 'lead', 'prospect', 'email', 'phone', 'address', 'company', 'organization'],
      'procurement': ['tender', 'bid', 'lot', 'contract', 'supplier', 'vendor', 'rfp', 'rfi', 'procurement', 'purchase']
    };

    // Check content against ontology keywords
    for (const [ontologyName, keywords] of Object.entries(ontologyKeywords)) {
      const keywordMatches = keywords.filter(keyword => content.includes(keyword));
      if (keywordMatches.length > 0) {
        detectedOntologies.add(ontologyName);
      }
    }

    // Check source metadata for hints
    if (normalizedData.metadata?.source) {
      const source = normalizedData.metadata.source.toString().toLowerCase();
      if (source.includes('financial') || source.includes('investment')) {
        detectedOntologies.add('financial');
      }
      if (source.includes('crm') || source.includes('contact')) {
        detectedOntologies.add('crm');
      }
      if (source.includes('procurement') || source.includes('tender')) {
        detectedOntologies.add('procurement');
      }
    }

    return Array.from(detectedOntologies);
  }

  /**
   * Get fallback ontologies based on source type
   */
  private getFallbackOntologies(sourceType: SourceType): string[] {
    switch (sourceType) {
      case 'email':
        return ['crm']; // Default to CRM for emails
      case 'document':
        return ['financial']; // Default to financial for documents
      case 'api':
        return ['financial']; // Default to financial for APIs
      case 'database':
        return ['financial']; // Default to financial for databases
      default:
        return ['crm']; // Fallback to CRM
    }
  }

  /**
   * Apply advanced relationships for detected ontologies
   */
  private async applyAdvancedRelationships(detectedOntologies: Set<string>, source: DataSource): Promise<void> {
    if (!this.advancedGraphService) {
      return;
    }

    // Apply ontology configurations for all detected ontologies
    for (const ontologyName of detectedOntologies) {
      try {
        // applyOntologyConfiguration is intentionally kept internal in the service; cast to any here to avoid TS visibility issue
        await (this.advancedGraphService as any).applyOntologyConfiguration(ontologyName);
        logger.debug(`Applied advanced relationships for ontology: ${ontologyName}`);
      } catch (error) {
        logger.warn(`Failed to apply advanced relationships for ontology ${ontologyName}:`, error);
        // Continue with other ontologies even if one fails
      }
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
