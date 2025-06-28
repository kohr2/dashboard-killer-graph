/**
 * Entity Extractor - Migrated from CRM services
 * Unified NLP service for entity extraction across all data sources
 * 
 * MIGRATION NOTE: This file was migrated from:
 * src/ontologies/crm/application/services/spacy-entity-extraction.service.ts
 */

import axios from 'axios';
import { singleton } from 'tsyringe';
import { logger } from '@shared/utils/logger';

// TODO: Update these imports to use unified types
// import { NormalizedData } from '../../core/types/normalized-data.interface';

export interface EntityExtractionResult {
  entities: unknown[]; // TODO: Use unified entity types
  relationships: unknown[]; // TODO: Use unified relationship types
  confidence: number;
  processingTime: number;
}

@singleton()
export class EntityExtractor {
  private readonly nlpServiceUrl: string;

  constructor() {
    this.nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Extract entities from any normalized data source
   * TODO: Refactor to work with unified NormalizedData interface
   */
  async extractEntities(data: unknown): Promise<EntityExtractionResult> {
    logger.info('🔍 Extracting entities using unified NLP service...');
    
    try {
      // Implementation pending unified entity extraction
      // 1. Prepare data for NLP service
      // 2. Call batch extraction endpoint
      // 3. Return standardized results
      
      return {
        entities: [],
        relationships: [],
        confidence: 0,
        processingTime: 0
      };
    } catch (error) {
      logger.error('❌ Entity extraction failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method for email entities - TODO: Remove after migration
   */
  async extractEmailEntities(subject: string, body: string, headers: Record<string, string>): Promise<EntityExtractionResult> {
    // TODO: Convert to use extractEntities with normalized data
    return this.extractEntities({ subject, body, headers });
  }
}
