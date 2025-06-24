// spaCy Entity Extraction Service - Primary NLP Engine
// Advanced entity extraction using spaCy NLP models for O-CREAM-v2 system

import { spawn } from 'child_process';
import { join } from 'path';

export interface SpacyExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  context: string;
  spacyLabel: string;
  metadata?: Record<string, any>;
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
  FAC = 'FAC' // Facility
}

export interface SpacyEntityExtractionResult {
  entities: SpacyExtractedEntity[];
  entityCount: number;
  entityTypes: EntityType[];
  confidence: number;
  processingTime: number;
  extensionResults?: Record<string, any>;
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
}

interface SpacyRawResult {
  success: boolean;
  entities: SpacyRawEntity[];
  total_count: number;
  error?: string;
}

export class SpacyEntityExtractionService {
  private readonly pythonScriptPath: string;
  private readonly defaultModel: string = 'en_core_web_lg';
  private readonly fallbackModel: string = 'en_core_web_sm';

  constructor(pythonScriptPath?: string) {
    this.pythonScriptPath = pythonScriptPath || join(__dirname, '../../../../scripts/spacy_entity_extractor.py');
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
      // Call spaCy Python script
      const spacyResult = await this.callSpacyExtractor(text, options?.model);
      
      if (!spacyResult.success) {
        throw new Error(`spaCy extraction failed: ${spacyResult.error}`);
      }

      // Convert spaCy results to our format
      const entities = this.convertSpacyEntities(spacyResult.entities, text);
      
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
        metadata: {
          textLength: text.length,
          extractionMethod: 'spacy',
          nlpModel: options?.model || this.defaultModel,
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
      const testResult = await this.callSpacyExtractor('Test message');
      
      return {
        availableModels: [this.defaultModel, this.fallbackModel],
        supportedEntityTypes: Object.values(EntityType),
        features: [
          'Named Entity Recognition (NER)',
          'Financial Domain Patterns',
          'Contextual Understanding',
          'Confidence Scoring',
          'Multi-language Support',
          'Custom Entity Types'
        ],
        status: testResult.success ? 'available' : 'degraded'
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
   * Call the Python spaCy extractor script
   */
  private async callSpacyExtractor(text: string, model?: string): Promise<SpacyRawResult> {
    return new Promise((resolve) => {
      const args = [this.pythonScriptPath, text];
      if (model) {
        args.push('--model', model);
      }
      
      const pythonProcess = spawn('python3', args);
      
      let stdout = '';
        let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            resolve({
              success: false,
              entities: [],
              total_count: 0,
              error: `JSON parse error: ${error}`
            });
          }
        } else {
          resolve({
            success: false,
            entities: [],
            total_count: 0,
            error: `Python script failed with code ${code}: ${stderr}`
          });
        }
      });
    });
  }

  /**
   * Convert spaCy raw entities to our typed format
   */
  private convertSpacyEntities(spacyEntities: SpacyRawEntity[], originalText: string): SpacyExtractedEntity[] {
    const entities: SpacyExtractedEntity[] = [];
    
    for (const spacyEntity of spacyEntities) {
      // Find the entity position in the original text
      const position = originalText.indexOf(spacyEntity.value);
      
      if (position !== -1) {
        entities.push({
          type: this.mapSpacyTypeToEntityType(spacyEntity.type),
          value: spacyEntity.value,
          confidence: spacyEntity.confidence,
          startIndex: position,
          endIndex: position + spacyEntity.value.length,
          context: spacyEntity.context,
          spacyLabel: spacyEntity.spacy_label,
      metadata: {
            originalSpacyType: spacyEntity.type,
            extractionMethod: 'spacy_ner'
          }
        });
      }
    }
    
    return entities;
  }

  /**
   * Map spaCy entity types to our EntityType enum
   */
  private mapSpacyTypeToEntityType(spacyType: string): EntityType {
    const typeMapping: Record<string, EntityType> = {
      'PERSON_NAME': EntityType.PERSON_NAME,
      'COMPANY_NAME': EntityType.COMPANY_NAME,
      'FINANCIAL_INSTITUTION': EntityType.FINANCIAL_INSTITUTION,
      'FINANCIAL_INSTRUMENT': EntityType.FINANCIAL_INSTRUMENT,
      'STOCK_SYMBOL': EntityType.STOCK_SYMBOL,
      'MONETARY_AMOUNT': EntityType.MONETARY_AMOUNT,
      'EMAIL_ADDRESS': EntityType.EMAIL_ADDRESS,
      'PHONE_NUMBER': EntityType.PHONE_NUMBER,
      'LOCATION': EntityType.LOCATION,
      'DATE': EntityType.DATE,
      'TIME': EntityType.TIME,
      'PERCENTAGE': EntityType.PERCENTAGE,
      'NUMBER': EntityType.NUMBER,
      'ORDINAL_NUMBER': EntityType.ORDINAL_NUMBER,
      'JOB_TITLE': EntityType.JOB_TITLE,
      'WORK_OF_ART': EntityType.WORK_OF_ART,
      'FAC': EntityType.FAC
    };
    
    return typeMapping[spacyType] || EntityType.COMPANY_NAME; // Default fallback
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