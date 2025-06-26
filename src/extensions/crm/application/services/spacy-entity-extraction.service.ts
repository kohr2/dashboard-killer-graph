// spaCy Entity Extraction Service - Now using a dedicated microservice
// Advanced entity extraction using spaCy NLP models for O-CREAM-v2 system

import { singleton } from 'tsyringe';
import axios from 'axios';

export interface SpacyExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  context: string;
  spacyLabel: string;
  metadata?: Record<string, any>;
  source?: string;
}

export enum EntityType {
  // Contact Information
  EMAIL_ADDRESS = 'EMAIL_ADDRESS',
  PHONE_NUMBER = 'PHONE_NUMBER',
  PERSON_NAME = 'PERSON_NAME',
  COMPANY_NAME = 'COMPANY_NAME',
  JOB_TITLE = 'JOB_TITLE',
  
  // Financial Information
  MONETARY_AMOUNT = 'MONETARY_AMOUNT',
  CURRENCY = 'CURRENCY',
  STOCK_SYMBOL = 'STOCK_SYMBOL',
  FINANCIAL_INSTITUTION = 'FINANCIAL_INSTITUTION',
  FINANCIAL_INSTRUMENT = 'FINANCIAL_INSTRUMENT',
  ACCOUNT_NUMBER = 'ACCOUNT_NUMBER',
  
  // Temporal Information
  DATE = 'DATE',
  TIME = 'TIME',
  DURATION = 'DURATION',
  DEADLINE = 'DEADLINE',
  
  // Business Information
  PROJECT_NAME = 'PROJECT_NAME',
  PRODUCT_NAME = 'PRODUCT_NAME',
  CONTRACT_NUMBER = 'CONTRACT_NUMBER',
  REFERENCE_NUMBER = 'REFERENCE_NUMBER',
  
  // Location Information
  LOCATION = 'LOCATION',
  ADDRESS = 'ADDRESS',
  CITY = 'CITY',
  STATE = 'STATE',
  COUNTRY = 'COUNTRY',
  ZIP_CODE = 'ZIP_CODE',
  
  // Technical Information
  URL = 'URL',
  IP_ADDRESS = 'IP_ADDRESS',
  FILE_PATH = 'FILE_PATH',
  VERSION_NUMBER = 'VERSION_NUMBER',
  
  // Document Information
  DOCUMENT_ID = 'DOCUMENT_ID',
  CASE_NUMBER = 'CASE_NUMBER',
  TICKET_NUMBER = 'TICKET_NUMBER',
  
  // Numerical Information
  PERCENTAGE = 'PERCENTAGE',
  NUMBER = 'NUMBER',
  ORDINAL_NUMBER = 'ORDINAL_NUMBER',
  QUANTITY = 'QUANTITY',
  
  // Other
  PRIORITY_LEVEL = 'PRIORITY_LEVEL',
  WORK_OF_ART = 'WORK_OF_ART',
  FAC = 'FAC', // Facility
  UNKNOWN = 'UNKNOWN',
}

export interface SpacyEntityExtractionResult {
  entities: SpacyExtractedEntity[];
  entityCount: number;
  entityTypes: EntityType[];
  confidence: number;
  processingTime: number;
  extensionResults?: Record<string, any>;
  embedding?: number[];
  metadata: {
    textLength: number;
    extractionMethod: 'spacy' | 'regex';
    nlpModel: string;
    languageDetected?: string;
    spacyVersion?: string;
    patterns?: string[];
  };
}

interface SpacyRawEntity {
  type: string;
  value: string;
  confidence: number;
  spacy_label: string;
  context: string;
  start: number;
  end: number;
}

interface SpacyRelationship {
  source: string;
  target: string;
  type: string;
  confidence: number;
  explanation?: string;
}

interface NlpGraphResponse {
  entities: SpacyRawEntity[];
  relationships: SpacyRelationship[];
  refinement_info: string;
  embedding: number[];
}

@singleton()
export class SpacyEntityExtractionService {
  private nlpServiceUrl: string;

  constructor() {
    this.nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Extract entities from text content using spaCy NLP
   */
  public async extractEntities(text: string, options?: {
    entityTypes?: EntityType[];
    minConfidence?: number;
    includeContext?: boolean;
    model?: string;
  }): Promise<SpacyEntityExtractionResult> {
    const startTime = Date.now();
    
    try {
      // Call spaCy Python service for graph extraction
      const graphResult = await this.callSpacyGraphExtractor(text);
      
      if (!graphResult) {
        throw new Error('spaCy graph extraction failed');
      }

      // Convert spaCy results to our format
      const entities = this.convertSpacyEntities(graphResult.entities, text);
      
      // Apply filters
      const filteredEntities = this.applyFilters(entities, options);
      
      // Calculate statistics
      const entityTypes = [...new Set(filteredEntities.map(e => e.type))];
      const overallConfidence = filteredEntities.length > 0 
        ? filteredEntities.reduce((sum, entity) => sum + entity.confidence, 0) / filteredEntities.length
        : 0;

      const processingTime = Date.now() - startTime;

      return {
        entities: filteredEntities,
        entityCount: filteredEntities.length,
        entityTypes,
        confidence: overallConfidence,
        processingTime,
        embedding: graphResult.embedding,
        metadata: {
          textLength: text.length,
          extractionMethod: 'spacy',
          nlpModel: 'none',
          languageDetected: 'en',
          spacyVersion: '3.8.2'
        }
      };

    } catch (error) {
      console.error('spaCy entity extraction failed:', error);
      
      // Fallback to basic regex extraction
      return this.fallbackExtraction(text, options, Date.now() - startTime);
    }
  }

  /**
   * Extract entities specifically for email content
   */
  public async extractEmailEntities(
    emailSubject: string,
    emailBody: string,
    headers?: Record<string, string>
  ): Promise<SpacyEntityExtractionResult> {
    // Combine email parts with proper weighting
    const combinedText = this.combineEmailContent(emailSubject, emailBody, headers);
    
    // Extract entities with email-specific settings
    const result = await this.extractEntities(combinedText, {
      includeContext: true,
      minConfidence: 0.6 // Lower threshold for email content
    });

    // Add email-specific post-processing
    result.entities = this.enhanceEmailEntities(result.entities, emailSubject, emailBody);
    result.metadata.extractionMethod = 'spacy';
    result.metadata.patterns = ['email_headers', 'email_signatures'];
    
    return result;
  }

  /**
   * Extract entities from multiple texts in batch
   */
  public async extractEntitiesBatch(texts: string[], options?: {
    entityTypes?: EntityType[];
    minConfidence?: number;
    includeContext?: boolean;
    model?: string;
  }): Promise<SpacyEntityExtractionResult[]> {
    const results: SpacyEntityExtractionResult[] = [];
    
    // Process texts in parallel (limited concurrency)
    const batchSize = 3;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.extractEntities(text, options));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Get entity extraction capabilities and model information
   */
  public async getCapabilities(): Promise<{
    availableModels: string[];
    supportedEntityTypes: EntityType[];
    features: string[];
    status: 'available' | 'unavailable' | 'degraded';
  }> {
    try {
      // Test spaCy availability
      const testResult = await this.callSpacyGraphExtractor('Test message');
      
      return {
        availableModels: ['none'],
        supportedEntityTypes: Object.values(EntityType),
        features: [
          'Named Entity Recognition (NER)',
          'Financial Domain Patterns',
          'Contextual Understanding',
          'Confidence Scoring',
          'Multi-language Support',
          'Custom Entity Types'
        ],
        status: testResult ? 'available' : 'unavailable'
      };
    } catch (error) {
      return {
        availableModels: [],
        supportedEntityTypes: [],
        features: [],
        status: 'unavailable'
      };
    }
  }

  /**
   * Make a POST request to the spaCy graph extraction microservice
   */
  private async callSpacyGraphExtractor(text: string): Promise<NlpGraphResponse> {
    try {
      const response = await axios.post<NlpGraphResponse>(`${this.nlpServiceUrl}/extract-graph`, { text });
      
      if (response.status !== 200) {
        throw new Error(`NLP service returned status ${response.status}`);
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        console.error(`Connection to NLP service at ${this.nlpServiceUrl} failed. Is the service running?`);
        throw new Error(`NLP service is unavailable.`);
      }
      console.error('An error occurred while calling the NLP service:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use callSpacyGraphExtractor for richer output including relationships and embeddings.
   */
  private async callSpacyExtractor(text: string): Promise<SpacyRawEntity[]> {
    // This method now only fetches basic entities and does not provide the full graph.
    const response = await axios.post<SpacyRawEntity[]>(`${this.nlpServiceUrl}/extract-entities`, { text });
    return response.data;
  }

  /**
   * Convert spaCy raw entities to our typed format
   */
  private convertSpacyEntities(spacyEntities: SpacyRawEntity[], originalText: string): SpacyExtractedEntity[] {
    return spacyEntities
      .map(spacyEntity => {
        const type = this.mapSpacyTypeToEntityType(spacyEntity.spacy_label);
        if (!type) return null;

        return {
          type,
          value: spacyEntity.value,
          confidence: spacyEntity.confidence,
          startIndex: spacyEntity.start,
          endIndex: spacyEntity.end,
          context: spacyEntity.context,
          spacyLabel: spacyEntity.spacy_label,
        };
      })
      .filter((entity): entity is SpacyExtractedEntity => entity !== null);
  }

  /**
   * Map spaCy entity types to our EntityType enum
   */
  private mapSpacyTypeToEntityType(spacyType: string): EntityType | null {
    switch (spacyType) {
      case 'PERSON':
        return EntityType.PERSON_NAME;
      case 'ORG':
        return EntityType.COMPANY_NAME;
      case 'GPE':
      case 'LOC':
        return EntityType.LOCATION;
      case 'DATE':
        return EntityType.DATE;
      case 'TIME':
        return EntityType.TIME;
      case 'MONEY':
        return EntityType.MONETARY_AMOUNT;
      case 'PRODUCT':
        return EntityType.PRODUCT_NAME;
      case 'WORK_OF_ART':
        return EntityType.WORK_OF_ART;
      case 'FAC':
        return EntityType.FAC;
      default:
        return EntityType.UNKNOWN;
    }
  }

  /**
   * Apply filters to extracted entities
   */
  private applyFilters(
    entities: SpacyExtractedEntity[], 
    options?: {
      entityTypes?: EntityType[];
      minConfidence?: number;
      includeContext?: boolean;
    }
  ): SpacyExtractedEntity[] {
    let filtered = entities;
    
    // Filter by entity types
    if (options?.entityTypes && options.entityTypes.length > 0) {
      filtered = filtered.filter(entity => options.entityTypes!.includes(entity.type));
    }
    
    // Filter by confidence
    if (options?.minConfidence !== undefined) {
      filtered = filtered.filter(entity => entity.confidence >= options.minConfidence!);
    }
    
    // Remove context if not needed
    if (options?.includeContext === false) {
      filtered = filtered.map(entity => ({
        ...entity,
        context: ''
      }));
    }
    
    // Remove duplicates and overlapping entities
    filtered = this.removeDuplicatesAndOverlaps(filtered);
    
    return filtered;
  }

  /**
   * Combine email content with proper formatting
   */
  private combineEmailContent(subject: string, body: string, headers?: Record<string, string>): string {
    let combined = `Subject: ${subject}\n\n${body}`;
    
    if (headers) {
      const headerText = Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      combined = `${headerText}\n\n${combined}`;
    }
    
    return combined;
  }

  /**
   * Enhance entities with email-specific information
   */
  private enhanceEmailEntities(
    entities: SpacyExtractedEntity[], 
    subject: string, 
    body: string
  ): SpacyExtractedEntity[] {
    return entities.map(entity => {
      const enhanced = { ...entity };
      
      // Add email section information
      if (entity.startIndex < subject.length + 10) { // Rough subject area
        enhanced.metadata = {
          ...enhanced.metadata,
          emailSection: 'subject'
        };
      } else {
        enhanced.metadata = {
          ...enhanced.metadata,
          emailSection: 'body'
        };
      }
      
      // Boost confidence for email addresses and phone numbers in signatures
      if ((entity.type === EntityType.EMAIL_ADDRESS || entity.type === EntityType.PHONE_NUMBER) &&
          entity.startIndex > body.length * 0.7) { // Likely in signature
        enhanced.confidence = Math.min(0.99, enhanced.confidence + 0.1);
        enhanced.metadata = {
          ...enhanced.metadata,
          likelySignature: true
        };
      }
      
      return enhanced;
    });
  }

  /**
   * Fallback to basic regex extraction if spaCy fails
   */
  private async fallbackExtraction(
    text: string, 
    options: any, 
    processingTime: number
  ): Promise<SpacyEntityExtractionResult> {
    console.warn('Using fallback regex extraction due to spaCy failure');
    
    const entities: SpacyExtractedEntity[] = [];
    
    // Basic email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailPattern.exec(text)) !== null) {
      entities.push({
        type: EntityType.EMAIL_ADDRESS,
        value: match[0],
        confidence: 0.9,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        context: this.extractContext(text, match.index, match[0].length),
        spacyLabel: 'EMAIL_FALLBACK',
        metadata: { extractionMethod: 'regex_fallback' }
      });
    }
    
    // Basic URL pattern
    const urlPattern = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
    while ((match = urlPattern.exec(text)) !== null) {
      entities.push({
        type: EntityType.URL,
        value: match[0],
        confidence: 0.9,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        context: this.extractContext(text, match.index, match[0].length),
        spacyLabel: 'URL_FALLBACK',
        metadata: { extractionMethod: 'regex_fallback' }
      });
    }
    
    // Basic phone pattern
    const phonePattern = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    while ((match = phonePattern.exec(text)) !== null) {
      entities.push({
        type: EntityType.PHONE_NUMBER,
        value: match[0],
        confidence: 0.8,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        context: this.extractContext(text, match.index, match[0].length),
        spacyLabel: 'PHONE_FALLBACK',
        metadata: { extractionMethod: 'regex_fallback' }
      });
    }
    
    const usedPatterns = ['email_headers', 'email_signatures'];

    return {
      entities,
      entityCount: entities.length,
      entityTypes: [...new Set(entities.map(e => e.type))],
      confidence: entities.length > 0 ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length : 0,
      processingTime,
      metadata: {
        textLength: text.length,
        extractionMethod: 'regex',
        nlpModel: 'none',
        patterns: usedPatterns
      }
    };
  }

  /**
   * Extract context around a position in text
   */
  private extractContext(text: string, position: number, length: number, windowSize: number = 50): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + length + windowSize);
    return text.substring(start, end).trim();
  }

  /**
   * Remove duplicate and overlapping entities
   */
  private removeDuplicatesAndOverlaps(entities: SpacyExtractedEntity[]): SpacyExtractedEntity[] {
    const sorted = entities.sort((a, b) => a.startIndex - b.startIndex);
    const filtered: SpacyExtractedEntity[] = [];
    
    for (const entity of sorted) {
      const hasOverlap = filtered.some(existing => 
        (entity.startIndex < existing.endIndex && entity.endIndex > existing.startIndex)
      );
      
      if (!hasOverlap) {
        filtered.push(entity);
      } else {
        // Keep the entity with higher confidence
        const overlapping = filtered.find(existing => 
          entity.startIndex < existing.endIndex && entity.endIndex > existing.startIndex
        );
        
        if (overlapping && entity.confidence > overlapping.confidence) {
          const index = filtered.indexOf(overlapping);
          filtered[index] = entity;
        }
      }
    }
    
    return filtered;
  }

  /**
   * Get statistics about extracted entities
   */
  public getEntityStatistics(entities: SpacyExtractedEntity[]): Record<string, any> {
    const typeDistribution = entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const confidenceDistribution = {
      high: entities.filter(e => e.confidence >= 0.8).length,
      medium: entities.filter(e => e.confidence >= 0.6 && e.confidence < 0.8).length,
      low: entities.filter(e => e.confidence < 0.6).length
    };

    return {
      totalEntities: entities.length,
      typeDistribution,
      confidenceDistribution,
      averageConfidence: entities.length > 0 
        ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
        : 0,
      spacyLabels: [...new Set(entities.map(e => e.spacyLabel))]
    };
  }
} 