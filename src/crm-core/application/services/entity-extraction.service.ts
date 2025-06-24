// Entity Extraction Service - Application Layer
// Advanced entity extraction for emails and text content in O-CREAM-v2 system

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  context: string;
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
  INVOICE_NUMBER = 'INVOICE_NUMBER',
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
  
  // Other
  PERCENTAGE = 'PERCENTAGE',
  QUANTITY = 'QUANTITY',
  PRIORITY_LEVEL = 'PRIORITY_LEVEL'
}

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  entityCount: number;
  entityTypes: EntityType[];
  confidence: number;
  processingTime: number;
  metadata: {
    textLength: number;
    extractionMethod: string;
    languageDetected?: string;
    patterns: string[];
  };
}

export class EntityExtractionService {
  private readonly patterns: Map<EntityType, RegExp[]> = new Map();
  private readonly contextPatterns: Map<EntityType, RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  /**
   * Extract entities from text content
   */
  public extractEntities(text: string, options?: {
    entityTypes?: EntityType[];
    minConfidence?: number;
    includeContext?: boolean;
  }): EntityExtractionResult {
    const startTime = Date.now();
    const entities: ExtractedEntity[] = [];
    const detectedTypes = new Set<EntityType>();
    const usedPatterns: string[] = [];

    const targetTypes = options?.entityTypes || Object.values(EntityType);
    const minConfidence = options?.minConfidence || 0.5;
    const includeContext = options?.includeContext ?? true;

    // Process each entity type
    for (const entityType of targetTypes) {
      const typeEntities = this.extractEntitiesOfType(text, entityType, includeContext);
      
      // Filter by confidence
      const filteredEntities = typeEntities.filter(entity => entity.confidence >= minConfidence);
      
      entities.push(...filteredEntities);
      
      if (filteredEntities.length > 0) {
        detectedTypes.add(entityType);
        usedPatterns.push(entityType);
      }
    }

    // Remove duplicates and overlapping entities
    const cleanedEntities = this.removeDuplicatesAndOverlaps(entities);

    // Calculate overall confidence
    const overallConfidence = cleanedEntities.length > 0 
      ? cleanedEntities.reduce((sum, entity) => sum + entity.confidence, 0) / cleanedEntities.length
      : 0;

    const processingTime = Date.now() - startTime;

    return {
      entities: cleanedEntities,
      entityCount: cleanedEntities.length,
      entityTypes: Array.from(detectedTypes),
      confidence: overallConfidence,
      processingTime,
      metadata: {
        textLength: text.length,
        extractionMethod: 'regex_pattern_matching',
        patterns: usedPatterns
      }
    };
  }

  /**
   * Extract entities specifically for email content
   */
  public extractEmailEntities(emailSubject: string, emailBody: string, headers?: Record<string, string>): EntityExtractionResult {
    const combinedText = `${emailSubject}\n\n${emailBody}`;
    
    // Extract basic entities
    const result = this.extractEntities(combinedText, {
      includeContext: true
    });

    // Add email-specific processing
    const emailSpecificEntities = this.extractEmailSpecificEntities(emailSubject, emailBody, headers);
    
    result.entities.push(...emailSpecificEntities);
    result.entityCount = result.entities.length;
    
    // Update metadata
    result.metadata.extractionMethod = 'email_optimized_extraction';
    result.metadata.patterns.push('email_headers', 'email_signatures');

    return result;
  }

  /**
   * Initialize regex patterns for entity extraction
   */
  private initializePatterns(): void {
    // Contact Information Patterns
    this.patterns.set(EntityType.EMAIL_ADDRESS, [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ]);

    this.patterns.set(EntityType.PHONE_NUMBER, [
      // US phone numbers
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      // International formats
      /\b\+?[1-9]\d{1,14}\b/g,
      // Common formats
      /\b\d{3}-\d{3}-\d{4}\b/g,
      /\b\(\d{3}\)\s?\d{3}-\d{4}\b/g
    ]);

    this.patterns.set(EntityType.PERSON_NAME, [
      // Simple name patterns (2-4 words, capitalized)
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g
    ]);

    // Financial Information Patterns
    this.patterns.set(EntityType.MONETARY_AMOUNT, [
      // Currency symbols with amounts
      /\$[\d,]+(?:\.\d{2})?/g,
      /€[\d,]+(?:\.\d{2})?/g,
      /£[\d,]+(?:\.\d{2})?/g,
      // Written amounts
      /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|USD|euros?|EUR|pounds?|GBP)\b/gi
    ]);

    this.patterns.set(EntityType.INVOICE_NUMBER, [
      /\b(?:invoice|inv)[\s#-]*([A-Z0-9-]+)\b/gi,
      /\bINV-\d{4}-\d{3,6}\b/g
    ]);

    // Temporal Information Patterns
    this.patterns.set(EntityType.DATE, [
      // Various date formats
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
      /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi,
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi
    ]);

    this.patterns.set(EntityType.TIME, [
      /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g,
      /\b(?:1[0-2]|0?[1-9]):[0-5][0-9]\s*(?:AM|PM|am|pm)\b/g
    ]);

    // Business Information Patterns
    this.patterns.set(EntityType.PROJECT_NAME, [
      /\b(?:project|proj)[\s:]*([A-Z][A-Za-z0-9\s-]+)\b/gi
    ]);

    this.patterns.set(EntityType.CONTRACT_NUMBER, [
      /\b(?:contract|agreement)[\s#-]*([A-Z0-9-]+)\b/gi,
      /\bCTR-\d{4}-\d{3,6}\b/g
    ]);

    // Location Information Patterns
    this.patterns.set(EntityType.ZIP_CODE, [
      /\b\d{5}(?:-\d{4})?\b/g
    ]);

    this.patterns.set(EntityType.ADDRESS, [
      /\b\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi
    ]);

    // Technical Information Patterns
    this.patterns.set(EntityType.URL, [
      /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g,
      /\b(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/g
    ]);

    this.patterns.set(EntityType.IP_ADDRESS, [
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
    ]);

    // Document Information Patterns
    this.patterns.set(EntityType.CASE_NUMBER, [
      /\b(?:case|ticket|ref)[\s#-]*([A-Z0-9-]+)\b/gi
    ]);

    // Other Patterns
    this.patterns.set(EntityType.PERCENTAGE, [
      /\b\d+(?:\.\d+)?%/g
    ]);

    // Context patterns for better accuracy
    this.initializeContextPatterns();
  }

  private initializeContextPatterns(): void {
    // Context patterns help improve accuracy by looking at surrounding text
    this.contextPatterns.set(EntityType.MONETARY_AMOUNT, [
      /(?:budget|cost|price|amount|total|payment|invoice|bill|charge|fee)[\s:]*\$[\d,]+(?:\.\d{2})?/gi,
      /\$[\d,]+(?:\.\d{2})?[\s]*(?:budget|cost|price|amount|total|payment|invoice|bill|charge|fee)/gi
    ]);

    this.contextPatterns.set(EntityType.DEADLINE, [
      /(?:deadline|due|expires?|by)[\s:]*\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b[\s]*(?:deadline|due|expires?)/gi
    ]);

    this.contextPatterns.set(EntityType.PERSON_NAME, [
      /(?:from|to|cc|bcc|contact|manager|director|ceo|cto|cfo)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[\s,]*(?:manager|director|ceo|cto|cfo)/gi
    ]);
  }

  /**
   * Extract entities of a specific type from text
   */
  private extractEntitiesOfType(text: string, entityType: EntityType, includeContext: boolean): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const patterns = this.patterns.get(entityType) || [];
    const contextPatterns = this.contextPatterns.get(entityType) || [];

    // Process regular patterns
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          const entity: ExtractedEntity = {
            type: entityType,
            value: match[0].trim(),
            confidence: this.calculateConfidence(entityType, match[0], text, match.index),
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            context: includeContext ? this.extractContext(text, match.index, match[0].length) : '',
            metadata: {
              patternType: 'regular',
              matchedPattern: pattern.source
            }
          };
          
          entities.push(entity);
        }
      }
    }

    // Process context patterns (higher confidence)
    for (const pattern of contextPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        if (match.index !== undefined && match[1]) {
          const entity: ExtractedEntity = {
            type: entityType,
            value: match[1].trim(),
            confidence: Math.min(this.calculateConfidence(entityType, match[1], text, match.index) + 0.2, 1.0),
            startIndex: match.index + match[0].indexOf(match[1]),
            endIndex: match.index + match[0].indexOf(match[1]) + match[1].length,
            context: includeContext ? this.extractContext(text, match.index, match[0].length) : '',
            metadata: {
              patternType: 'context',
              matchedPattern: pattern.source,
              fullMatch: match[0]
            }
          };
          
          entities.push(entity);
        }
      }
    }

    return entities;
  }

  /**
   * Extract email-specific entities
   */
  private extractEmailSpecificEntities(subject: string, body: string, headers?: Record<string, string>): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract signature information
    const signatureEntities = this.extractSignatureEntities(body);
    entities.push(...signatureEntities);

    // Extract meeting/calendar information
    const meetingEntities = this.extractMeetingEntities(subject + '\n' + body);
    entities.push(...meetingEntities);

    // Extract business-specific entities
    const businessEntities = this.extractBusinessEntities(subject + '\n' + body);
    entities.push(...businessEntities);

    return entities;
  }

  /**
   * Extract entities from email signatures
   */
  private extractSignatureEntities(body: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    // Look for signature patterns (usually at the end of email)
    const signaturePatterns = [
      /(?:best regards?|sincerely|thanks?|cheers),?\s*\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
      /\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*\n\s*([A-Z][a-z\s]+)\s*\n/g
    ];

    for (const pattern of signaturePatterns) {
      const matches = Array.from(body.matchAll(pattern));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          // Extract name
          if (match[1]) {
            entities.push({
              type: EntityType.PERSON_NAME,
              value: match[1].trim(),
              confidence: 0.8,
              startIndex: match.index + match[0].indexOf(match[1]),
              endIndex: match.index + match[0].indexOf(match[1]) + match[1].length,
              context: this.extractContext(body, match.index, match[0].length),
              metadata: {
                source: 'email_signature',
                patternType: 'signature'
              }
            });
          }
          
          // Extract job title if present
          if (match[2]) {
            entities.push({
              type: EntityType.JOB_TITLE,
              value: match[2].trim(),
              confidence: 0.7,
              startIndex: match.index + match[0].indexOf(match[2]),
              endIndex: match.index + match[0].indexOf(match[2]) + match[2].length,
              context: this.extractContext(body, match.index, match[0].length),
              metadata: {
                source: 'email_signature',
                patternType: 'signature'
              }
            });
          }
        }
      }
    }

    return entities;
  }

  /**
   * Extract meeting/calendar related entities
   */
  private extractMeetingEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    const meetingPatterns = [
      /(?:meeting|call|conference)[\s:]*([A-Z][A-Za-z0-9\s-]+)/gi,
      /(?:scheduled|planned)[\s:]*(?:for|on)[\s]*([A-Z][A-Za-z0-9\s-]+)/gi
    ];

    for (const pattern of meetingPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        if (match.index !== undefined && match[1]) {
          entities.push({
            type: EntityType.PROJECT_NAME,
            value: match[1].trim(),
            confidence: 0.6,
            startIndex: match.index + match[0].indexOf(match[1]),
            endIndex: match.index + match[0].indexOf(match[1]) + match[1].length,
            context: this.extractContext(text, match.index, match[0].length),
            metadata: {
              source: 'meeting_context',
              category: 'meeting'
            }
          });
        }
      }
    }

    return entities;
  }

  /**
   * Extract business-specific entities
   */
  private extractBusinessEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    const businessPatterns = [
      /(?:proposal|quote|estimate)[\s#-]*([A-Z0-9-]+)/gi,
      /(?:po|purchase order)[\s#-]*([A-Z0-9-]+)/gi,
      /(?:req|requirement)[\s#-]*([A-Z0-9-]+)/gi
    ];

    for (const pattern of businessPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        if (match.index !== undefined && match[1]) {
          entities.push({
            type: EntityType.REFERENCE_NUMBER,
            value: match[1].trim(),
            confidence: 0.8,
            startIndex: match.index + match[0].indexOf(match[1]),
            endIndex: match.index + match[0].indexOf(match[1]) + match[1].length,
            context: this.extractContext(text, match.index, match[0].length),
            metadata: {
              source: 'business_context',
              category: 'business_reference'
            }
          });
        }
      }
    }

    return entities;
  }

  /**
   * Calculate confidence score for an extracted entity
   */
  private calculateConfidence(entityType: EntityType, value: string, fullText: string, position: number): number {
    let confidence = 0.5; // Base confidence

    // Length-based confidence adjustments
    if (value.length < 3) confidence -= 0.2;
    if (value.length > 50) confidence -= 0.1;

    // Type-specific confidence adjustments
    switch (entityType) {
      case EntityType.EMAIL_ADDRESS:
        confidence = value.includes('@') && value.includes('.') ? 0.95 : 0.3;
        break;
      
      case EntityType.PHONE_NUMBER:
        const digitCount = (value.match(/\d/g) || []).length;
        confidence = digitCount >= 10 ? 0.9 : (digitCount >= 7 ? 0.7 : 0.4);
        break;
      
      case EntityType.MONETARY_AMOUNT:
        confidence = /^\$[\d,]+(?:\.\d{2})?$/.test(value) ? 0.9 : 0.6;
        break;
      
      case EntityType.DATE:
        confidence = this.isValidDate(value) ? 0.8 : 0.4;
        break;
      
      case EntityType.URL:
        confidence = value.startsWith('http') ? 0.95 : 0.7;
        break;
    }

    // Context-based confidence boost
    const contextWindow = this.extractContext(fullText, position, value.length, 20);
    if (this.hasRelevantContext(entityType, contextWindow)) {
      confidence += 0.1;
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Extract context around an entity
   */
  private extractContext(text: string, position: number, length: number, windowSize: number = 50): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + length + windowSize);
    return text.substring(start, end).trim();
  }

  /**
   * Check if context is relevant for entity type
   */
  private hasRelevantContext(entityType: EntityType, context: string): boolean {
    const contextKeywords: Record<EntityType, string[]> = {
      [EntityType.MONETARY_AMOUNT]: ['budget', 'cost', 'price', 'payment', 'invoice', 'total'],
      [EntityType.PERSON_NAME]: ['from', 'to', 'contact', 'manager', 'director'],
      [EntityType.DATE]: ['deadline', 'due', 'scheduled', 'meeting', 'appointment'],
      [EntityType.PHONE_NUMBER]: ['call', 'phone', 'mobile', 'contact'],
      [EntityType.EMAIL_ADDRESS]: ['email', 'contact', 'reach', 'send']
    } as any;

    const keywords = contextKeywords[entityType] || [];
    const lowerContext = context.toLowerCase();
    
    return keywords.some(keyword => lowerContext.includes(keyword));
  }

  /**
   * Remove duplicate and overlapping entities
   */
  private removeDuplicatesAndOverlaps(entities: ExtractedEntity[]): ExtractedEntity[] {
    // Sort by position
    entities.sort((a, b) => a.startIndex - b.startIndex);

    const result: ExtractedEntity[] = [];
    
    for (const entity of entities) {
      // Check for overlaps with existing entities
      const hasOverlap = result.some(existing => 
        (entity.startIndex >= existing.startIndex && entity.startIndex < existing.endIndex) ||
        (entity.endIndex > existing.startIndex && entity.endIndex <= existing.endIndex) ||
        (entity.startIndex <= existing.startIndex && entity.endIndex >= existing.endIndex)
      );

      if (!hasOverlap) {
        // Check for exact duplicates
        const isDuplicate = result.some(existing => 
          existing.type === entity.type && 
          existing.value === entity.value &&
          Math.abs(existing.startIndex - entity.startIndex) < 10
        );

        if (!isDuplicate) {
          result.push(entity);
        }
      } else {
        // If there's an overlap, keep the one with higher confidence
        const overlappingIndex = result.findIndex(existing => 
          (entity.startIndex >= existing.startIndex && entity.startIndex < existing.endIndex) ||
          (entity.endIndex > existing.startIndex && entity.endIndex <= existing.endIndex)
        );

        if (overlappingIndex !== -1 && entity.confidence > result[overlappingIndex].confidence) {
          result[overlappingIndex] = entity;
        }
      }
    }

    return result;
  }

  /**
   * Validate if a string represents a valid date
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
  }

  /**
   * Get entity statistics
   */
  public getEntityStatistics(entities: ExtractedEntity[]): Record<string, any> {
    const stats: Record<string, any> = {
      totalEntities: entities.length,
      averageConfidence: entities.length > 0 
        ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
        : 0,
      entityTypeDistribution: {},
      highConfidenceEntities: entities.filter(e => e.confidence > 0.8).length,
      mediumConfidenceEntities: entities.filter(e => e.confidence > 0.5 && e.confidence <= 0.8).length,
      lowConfidenceEntities: entities.filter(e => e.confidence <= 0.5).length
    };

    // Count entities by type
    for (const entity of entities) {
      stats.entityTypeDistribution[entity.type] = (stats.entityTypeDistribution[entity.type] || 0) + 1;
    }

    return stats;
  }
} 