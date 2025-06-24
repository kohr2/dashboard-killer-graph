// Extensible Entity Extraction Service
// Integrates with core CRM and domain extensions (Financial/FIBO, Healthcare, Legal, etc.)

import { ExtractedEntity, EntityType, EntityExtractionResult } from './entity-extraction.service';
import { SpacyEntityExtractionService } from './spacy-entity-extraction.service';
import { OCreamV2Ontology, KnowledgeType, ActivityType } from '../../domain/ontology/o-cream-v2';

// Extension-specific entity types
export interface ExtensionEntityRegistry {
  extensionName: string;
  entityTypes: ExtensionEntityType[];
  ontologyMapping: Record<string, string>;
  customExtractors: CustomExtractor[];
}

export interface ExtensionEntityType {
  type: string;
  category: 'FINANCIAL' | 'HEALTHCARE' | 'LEGAL' | 'REAL_ESTATE' | 'CUSTOM';
  description: string;
  patterns?: RegExp[];
  spacyLabels?: string[];
  contextKeywords?: string[];
  validationRules?: ValidationRule[];
}

export interface CustomExtractor {
  name: string;
  entityTypes: string[];
  extract: (text: string, context?: any) => Promise<ExtractedEntity[]>;
}

export interface ValidationRule {
  type: 'format' | 'range' | 'context' | 'custom';
  rule: string | RegExp | ((value: string, context?: any) => boolean);
  errorMessage: string;
}

// Financial/FIBO Entity Types
export const FINANCIAL_ENTITY_TYPES: ExtensionEntityType[] = [
  // FIBO Financial Instruments
  {
    type: 'FIBO_SECURITY',
    category: 'FINANCIAL',
    description: 'Financial securities (stocks, bonds, derivatives)',
    patterns: [
      /\b[A-Z]{1,5}\s*(?:stock|shares?|equity|securities?)\b/gi,
      /\b(?:NYSE|NASDAQ|LSE):\s*[A-Z]{1,5}\b/gi
    ],
    spacyLabels: ['ORG', 'PRODUCT'],
    contextKeywords: ['stock', 'shares', 'equity', 'security', 'ticker', 'symbol']
  },
  {
    type: 'FIBO_CURRENCY',
    category: 'FINANCIAL',
    description: 'Currency codes and amounts (ISO 4217)',
    patterns: [
      /\b[A-Z]{3}\s*[\d,]+(?:\.\d{2})?\b/g, // USD 1,000.00
      /[€$£¥₹]\s*[\d,]+(?:\.\d{2})?\b/g     // $1,000.00
    ],
    spacyLabels: ['MONEY'],
    contextKeywords: ['currency', 'exchange', 'rate', 'forex']
  },
  {
    type: 'FIBO_FINANCIAL_RATIO',
    category: 'FINANCIAL',
    description: 'Financial ratios and metrics',
    patterns: [
      /\b(?:P\/E|PE)\s*ratio\s*(?:of\s*)?[\d.]+\b/gi,
      /\b(?:ROI|ROE|ROA)\s*(?:of\s*)?[\d.]+%?\b/gi,
      /\bEBITDA\s*(?:of\s*)?\$?[\d,]+(?:\.\d+)?[KMB]?\b/gi
    ],
    contextKeywords: ['ratio', 'metric', 'performance', 'return', 'margin']
  },
  {
    type: 'FIBO_FINANCIAL_INSTITUTION',
    category: 'FINANCIAL',
    description: 'Banks, investment firms, financial institutions',
    patterns: [
      /\b(?:Goldman\s+Sachs|JP\s*Morgan|Morgan\s+Stanley|Bank\s+of\s+America)\b/gi,
      /\b\w+\s+(?:Bank|Credit\s+Union|Investment|Securities|Capital)\b/gi
    ],
    spacyLabels: ['ORG'],
    contextKeywords: ['bank', 'investment', 'securities', 'capital', 'fund']
  },
  {
    type: 'FIBO_FINANCIAL_PRODUCT',
    category: 'FINANCIAL',
    description: 'Financial products and services',
    patterns: [
      /\b(?:mortgage|loan|credit\s+line|derivatives?|options?|futures?)\b/gi,
      /\b(?:mutual\s+fund|ETF|hedge\s+fund|portfolio)\b/gi
    ],
    contextKeywords: ['product', 'service', 'offering', 'instrument']
  },
  {
    type: 'FIBO_MARKET_DATA',
    category: 'FINANCIAL',
    description: 'Market data and trading information',
    patterns: [
      /\b(?:bid|ask|spread):\s*[\d.]+\b/gi,
      /\bvolume:\s*[\d,]+\b/gi,
      /\b(?:open|high|low|close):\s*[\d.]+\b/gi
    ],
    contextKeywords: ['trading', 'market', 'price', 'volume', 'volatility']
  },
  {
    type: 'FIBO_REGULATORY_ID',
    category: 'FINANCIAL',
    description: 'Regulatory identifiers (CUSIP, ISIN, LEI)',
    patterns: [
      /\bCUSIP:\s*[A-Z0-9]{9}\b/gi,
      /\bISIN:\s*[A-Z]{2}[A-Z0-9]{10}\b/gi,
      /\bLEI:\s*[A-Z0-9]{20}\b/gi
    ],
    validationRules: [
      {
        type: 'format',
        rule: /^[A-Z0-9]{9}$/,
        errorMessage: 'CUSIP must be 9 alphanumeric characters'
      }
    ]
  }
];

// Healthcare Entity Types (example)
export const HEALTHCARE_ENTITY_TYPES: ExtensionEntityType[] = [
  {
    type: 'MEDICAL_CONDITION',
    category: 'HEALTHCARE',
    description: 'Medical conditions and diagnoses',
    patterns: [/\b(?:diabetes|hypertension|covid-19|cancer)\b/gi],
    contextKeywords: ['diagnosis', 'condition', 'disease', 'syndrome']
  },
  {
    type: 'MEDICATION',
    category: 'HEALTHCARE',
    description: 'Pharmaceutical drugs and medications',
    patterns: [/\b(?:aspirin|ibuprofen|metformin|insulin)\b/gi],
    contextKeywords: ['medication', 'drug', 'prescription', 'pharmaceutical']
  }
];

export class ExtensibleEntityExtractionService {
  private coreExtractor: SpacyEntityExtractionService;
  private ontology: OCreamV2Ontology;
  private extensionRegistry: Map<string, ExtensionEntityRegistry>;

  constructor() {
    this.coreExtractor = new SpacyEntityExtractionService();
    this.ontology = OCreamV2Ontology.getInstance();
    this.extensionRegistry = new Map();
    
    // Register built-in extensions
    this.registerBuiltInExtensions();
  }

  /**
   * Register a domain extension with its entity types
   */
  public registerExtension(registry: ExtensionEntityRegistry): void {
    this.extensionRegistry.set(registry.extensionName, registry);
    
    console.log(`📦 Registered extension: ${registry.extensionName} with ${registry.entityTypes.length} entity types`);
  }

  /**
   * Extract entities using both core CRM and extension-specific extractors
   */
  public async extractEntitiesWithExtensions(
    text: string,
    options?: {
      enabledExtensions?: string[];
      coreModel?: 'en_core_web_sm' | 'en_core_web_lg' | 'en_core_web_trf';
      includeValidation?: boolean;
      contextMetadata?: Record<string, any>;
    }
  ): Promise<ExtensionEntityExtractionResult> {
    const startTime = Date.now();
    
    // Extract core entities with spaCy
    const coreResult = await this.coreExtractor.extractEntities(text, {
      model: options?.coreModel
    });

    // Extract extension-specific entities
    const extensionResults = await this.extractExtensionEntities(
      text, 
      options?.enabledExtensions,
      options?.contextMetadata
    );

    // Merge and deduplicate results
    const mergedEntities = this.mergeEntityResults(
      coreResult.entities as any,
      extensionResults.entities
    );

    // Validate entities if requested
    if (options?.includeValidation) {
      await this.validateExtractedEntities(mergedEntities, text);
    }

    // Create O-CREAM-v2 knowledge elements
    const knowledgeElements = this.createKnowledgeElements(mergedEntities, text);

    // Generate insights
    const insights = this.generateExtensionInsights(mergedEntities, extensionResults.extensionMetadata);

    const processingTime = Date.now() - startTime;

    return {
      // Core results
      entities: mergedEntities,
      entityCount: mergedEntities.length,
      entityTypes: [...new Set(mergedEntities.map(e => e.type))],
      confidence: this.calculateOverallConfidence(mergedEntities),
      processingTime,
      
      // Extension results
      extensionResults: extensionResults.extensionResults,
      knowledgeElements,
      insights,
      
      // Metadata
      metadata: {
        textLength: text.length,
        extractionMethod: 'hybrid_spacy_extensions',
        languageDetected: coreResult.metadata.languageDetected,
        patterns: coreResult.metadata.patterns || [],
      }
    };
  }

  /**
   * Extract entities specific to registered extensions
   */
  private async extractExtensionEntities(
    text: string,
    enabledExtensions?: string[],
    contextMetadata?: Record<string, any>
  ): Promise<{
    entities: ExtractedEntity[];
    extensionResults: Record<string, ExtractedEntity[]>;
    extensionMetadata: Record<string, any>;
  }> {
    const allEntities: ExtractedEntity[] = [];
    const extensionResults: Record<string, ExtractedEntity[]> = {};
    const extensionMetadata: Record<string, any> = {};

    const activeExtensions = enabledExtensions || Array.from(this.extensionRegistry.keys());

    for (const extensionName of activeExtensions) {
      const registry = this.extensionRegistry.get(extensionName);
      if (!registry) continue;

      const extensionEntities: ExtractedEntity[] = [];

      // Extract using pattern-based extraction
      for (const entityType of registry.entityTypes) {
        const entities = await this.extractEntitiesForType(text, entityType, contextMetadata);
        extensionEntities.push(...entities);
      }

      // Extract using custom extractors
      for (const customExtractor of registry.customExtractors) {
        try {
          const customEntities = await customExtractor.extract(text, contextMetadata);
          extensionEntities.push(...customEntities);
        } catch (error) {
          console.warn(`Custom extractor ${customExtractor.name} failed:`, error);
        }
      }

      extensionResults[extensionName] = extensionEntities;
      allEntities.push(...extensionEntities);
      
      extensionMetadata[extensionName] = {
        entityCount: extensionEntities.length,
        entityTypes: [...new Set(extensionEntities.map(e => e.type))],
        averageConfidence: extensionEntities.length > 0 
          ? extensionEntities.reduce((sum, e) => sum + e.confidence, 0) / extensionEntities.length 
          : 0
      };
    }

    return { entities: allEntities, extensionResults, extensionMetadata };
  }

  /**
   * Extract entities for a specific extension entity type
   */
  private async extractEntitiesForType(
    text: string,
    entityType: ExtensionEntityType,
    contextMetadata?: Record<string, any>
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Pattern-based extraction
    if (entityType.patterns) {
      for (const pattern of entityType.patterns) {
        const matches = Array.from(text.matchAll(pattern));
        
        for (const match of matches) {
          if (match.index !== undefined) {
            const entity: ExtractedEntity = {
              type: entityType.type as any,
              value: match[0].trim(),
              confidence: this.calculatePatternConfidence(match[0], entityType, text),
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              context: this.extractContext(text, match.index, match[0].length),
              metadata: {
                extractionMethod: 'pattern',
                entityCategory: entityType.category,
                description: entityType.description,
                contextMetadata
              }
            };

            // Context-based confidence adjustment
            if (entityType.contextKeywords) {
              entity.confidence *= this.calculateContextBoost(text, match.index, entityType.contextKeywords);
            }

            entities.push(entity);
          }
        }
      }
    }

    return entities;
  }

  /**
   * Validate extracted entities using extension-specific rules
   */
  private async validateExtractedEntities(entities: ExtractedEntity[], text: string): Promise<void> {
    for (const entity of entities) {
      const registry = this.findRegistryForEntityType(entity.type);
      if (!registry) continue;

      const entityType = registry.entityTypes.find(et => et.type === entity.type);
      if (!entityType?.validationRules) continue;

      for (const rule of entityType.validationRules) {
        const isValid = await this.validateEntity(entity, rule);
        if (!isValid) {
          entity.confidence *= 0.5; // Reduce confidence for invalid entities
          entity.metadata = {
            ...entity.metadata,
            validationError: rule.errorMessage,
            isValid: false
          };
        }
      }
    }
  }

  /**
   * Create O-CREAM-v2 knowledge elements from extracted entities
   */
  private createKnowledgeElements(entities: ExtractedEntity[], text: string): any[] {
    const knowledgeElements = [];

    // Group entities by category
    const entityGroups = this.groupEntitiesByCategory(entities);

    // Create knowledge elements for each category
    for (const [category, categoryEntities] of entityGroups) {
      const knowledgeElement = {
        id: `knowledge_${category}_${Date.now()}`,
        type: this.mapCategoryToKnowledgeType(category),
        entities: categoryEntities,
        extractedFrom: text.substring(0, 200) + '...',
        confidence: categoryEntities.reduce((sum, e) => sum + e.confidence, 0) / categoryEntities.length,
        createdAt: new Date().toISOString(),
        metadata: {
          category,
          entityCount: categoryEntities.length,
          extractionMethod: 'extensible_extraction'
        }
      };

      knowledgeElements.push(knowledgeElement);
    }

    return knowledgeElements;
  }

  /**
   * Generate insights from extension-specific entity extraction
   */
  private generateExtensionInsights(
    entities: ExtractedEntity[],
    extensionMetadata: Record<string, any>
  ): ExtensionInsights {
    const insights: ExtensionInsights = {
      domainAnalysis: {},
      crossDomainRelationships: [],
      riskAssessment: {
        score: 0,
        factors: []
      },
      recommendations: []
    };

    // Analyze each domain
    for (const [extensionName, metadata] of Object.entries(extensionMetadata)) {
      insights.domainAnalysis[extensionName] = {
        entityCount: metadata.entityCount,
        confidence: metadata.averageConfidence,
        coverage: this.calculateDomainCoverage(extensionName, entities),
        keyEntities: this.getTopEntitiesForDomain(extensionName, entities)
      };
    }

    // Identify cross-domain relationships
    insights.crossDomainRelationships = this.identifyCrossDomainRelationships(entities);

    // Calculate risk assessment (especially for financial entities)
    insights.riskAssessment = this.calculateRiskAssessment(entities);

    // Generate recommendations
    insights.recommendations = this.generateRecommendations(entities, extensionMetadata);

    return insights;
  }

  /**
   * Register built-in extensions
   */
  private registerBuiltInExtensions(): void {
    // Financial/FIBO Extension
    this.registerExtension({
      extensionName: 'financial',
      entityTypes: FINANCIAL_ENTITY_TYPES,
      ontologyMapping: {
        'FIBO_SECURITY': 'BusinessKnowledge',
        'FIBO_CURRENCY': 'TransactionalKnowledge',
        'FIBO_FINANCIAL_RATIO': 'MarketIntelligence',
        'FIBO_FINANCIAL_INSTITUTION': 'BusinessKnowledge',
        'FIBO_FINANCIAL_PRODUCT': 'BusinessKnowledge',
        'FIBO_MARKET_DATA': 'MarketIntelligence',
        'FIBO_REGULATORY_ID': 'TransactionalKnowledge'
      },
      customExtractors: [
        {
          name: 'financial_sentiment_extractor',
          entityTypes: ['FIBO_MARKET_SENTIMENT'],
          extract: async (text: string) => {
            // Custom financial sentiment analysis
            return this.extractFinancialSentiment(text);
          }
        }
      ]
    });

    // Healthcare Extension
    this.registerExtension({
      extensionName: 'healthcare',
      entityTypes: HEALTHCARE_ENTITY_TYPES,
      ontologyMapping: {
        'MEDICAL_CONDITION': 'CustomerKnowledge',
        'MEDICATION': 'CustomerKnowledge'
      },
      customExtractors: []
    });
  }

  // Helper methods
  private mergeEntityResults(coreEntities: ExtractedEntity[], extensionEntities: ExtractedEntity[]): ExtractedEntity[] {
    const allEntities = [...coreEntities, ...extensionEntities];
    
    // Remove duplicates based on value and position
    const uniqueEntities = allEntities.filter((entity, index, array) => 
      array.findIndex(e => 
        e.value === entity.value && 
        Math.abs(e.startIndex - entity.startIndex) < 5
      ) === index
    );

    return uniqueEntities.sort((a, b) => a.startIndex - b.startIndex);
  }

  private calculateOverallConfidence(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 0;
    return entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length;
  }

  private calculatePatternConfidence(match: string, entityType: ExtensionEntityType, text: string): number {
    let confidence = 0.7; // Base confidence for pattern matches
    
    // Boost confidence based on match length and complexity
    if (match.length > 10) confidence += 0.1;
    if (/[A-Z]{2,}/.test(match)) confidence += 0.1; // Contains uppercase sequences
    if (/\d/.test(match)) confidence += 0.1; // Contains numbers
    
    return Math.min(confidence, 0.95);
  }

  private calculateContextBoost(text: string, position: number, keywords: string[]): number {
    const contextWindow = 100;
    const start = Math.max(0, position - contextWindow);
    const end = Math.min(text.length, position + contextWindow);
    const context = text.substring(start, end).toLowerCase();
    
    const keywordMatches = keywords.filter(keyword => 
      context.includes(keyword.toLowerCase())
    ).length;
    
    return Math.min(1.0 + (keywordMatches * 0.1), 1.5);
  }

  private extractContext(text: string, position: number, length: number, windowSize: number = 50): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + length + windowSize);
    return text.substring(start, end).trim();
  }

  private findRegistryForEntityType(entityType: string): ExtensionEntityRegistry | undefined {
    for (const registry of this.extensionRegistry.values()) {
      if (registry.entityTypes.some(et => et.type === entityType)) {
        return registry;
      }
    }
    return undefined;
  }

  private async validateEntity(entity: ExtractedEntity, rule: ValidationRule): Promise<boolean> {
    switch (rule.type) {
      case 'format':
        if (rule.rule instanceof RegExp) {
          return rule.rule.test(entity.value);
        }
        return true;
      
      case 'custom':
        if (typeof rule.rule === 'function') {
          return rule.rule(entity.value, entity.context);
        }
        return true;
      
      default:
        return true;
    }
  }

  private groupEntitiesByCategory(entities: ExtractedEntity[]): Map<string, ExtractedEntity[]> {
    const groups = new Map<string, ExtractedEntity[]>();
    
    for (const entity of entities) {
      const category = entity.metadata?.entityCategory || 'GENERAL';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(entity);
    }
    
    return groups;
  }

  private mapCategoryToKnowledgeType(category: string): KnowledgeType {
    const mapping: Record<string, KnowledgeType> = {
      'FINANCIAL': KnowledgeType.MARKET_INTELLIGENCE,
      'HEALTHCARE': KnowledgeType.PRODUCT_KNOWLEDGE,
      'LEGAL': KnowledgeType.PROCESS_KNOWLEDGE,
      'GENERAL': KnowledgeType.CUSTOMER_BEHAVIOR
    };
    
    return mapping[category] || KnowledgeType.CUSTOMER_PROFILE;
  }

  private calculateDomainCoverage(extensionName: string, entities: ExtractedEntity[]): number {
    const extensionEntities = entities.filter(e => 
      e.metadata?.extractionMethod === 'pattern' && 
      e.metadata?.entityCategory === extensionName.toUpperCase()
    );
    
    return extensionEntities.length / Math.max(entities.length, 1);
  }

  private getTopEntitiesForDomain(extensionName: string, entities: ExtractedEntity[]): ExtractedEntity[] {
    return entities
      .filter(e => e.metadata?.entityCategory === extensionName.toUpperCase())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private identifyCrossDomainRelationships(entities: ExtractedEntity[]): CrossDomainRelationship[] {
    const relationships: CrossDomainRelationship[] = [];
    
    // Example: Financial entities + Person entities = Investment relationship
    const financialEntities = entities.filter(e => e.metadata?.entityCategory === 'FINANCIAL');
    const personEntities = entities.filter(e => e.type === EntityType.PERSON_NAME);
    
    if (financialEntities.length > 0 && personEntities.length > 0) {
      relationships.push({
        type: 'FINANCIAL_RELATIONSHIP',
        entities: [...financialEntities.slice(0, 2), ...personEntities.slice(0, 2)],
        confidence: 0.8,
        description: 'Financial entities associated with specific persons'
      });
    }
    
    return relationships;
  }

  private calculateRiskAssessment(entities: ExtractedEntity[]): RiskAssessment {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Check for high-value financial entities
    const financialEntities = entities.filter(e => e.metadata?.entityCategory === 'FINANCIAL');
    if (financialEntities.length > 5) {
      riskFactors.push('High volume of financial entities detected');
      riskScore += 0.3;
    }

    // Check for regulatory identifiers
    const regulatoryEntities = entities.filter(e => e.type.includes('REGULATORY'));
    if (regulatoryEntities.length > 0) {
      riskFactors.push('Regulatory identifiers present');
      riskScore += 0.2;
    }

    return {
      score: Math.min(riskScore, 1.0),
      factors: riskFactors
    };
  }

  private generateRecommendations(entities: ExtractedEntity[], extensionMetadata: Record<string, any>): string[] {
    const recommendations: string[] = [];

    // Financial recommendations
    if (extensionMetadata.financial?.entityCount > 0) {
      recommendations.push('Consider creating financial tracking records for detected entities');
      recommendations.push('Review compliance requirements for financial data handling');
    }

    // General recommendations
    if (entities.length > 10) {
      recommendations.push('High entity density detected - consider automated processing');
    }

    return recommendations;
  }

  private async extractFinancialSentiment(text: string): Promise<ExtractedEntity[]> {
    // Simplified financial sentiment extraction
    const positivePatterns = /\b(?:profit|gain|growth|bullish|positive|increase)\b/gi;
    const negativePatterns = /\b(?:loss|decline|bearish|negative|decrease|risk)\b/gi;
    
    const entities: ExtractedEntity[] = [];
    
    const positiveMatches = Array.from(text.matchAll(positivePatterns));
    const negativeMatches = Array.from(text.matchAll(negativePatterns));
    
    // Create sentiment entities
    if (positiveMatches.length > negativeMatches.length) {
      entities.push({
        type: 'FIBO_MARKET_SENTIMENT' as any,
        value: 'POSITIVE',
        confidence: 0.8,
        startIndex: 0,
        endIndex: text.length,
        context: text.substring(0, 100),
        metadata: {
          sentimentScore: positiveMatches.length - negativeMatches.length,
          extractionMethod: 'custom_sentiment'
        }
      });
    }
    
    return entities;
  }
}

// Extended result interface
export interface ExtensionEntityExtractionResult extends EntityExtractionResult {
  extensionResults: Record<string, ExtractedEntity[]>;
  knowledgeElements: any[];
  insights: ExtensionInsights;
}

export interface ExtensionInsights {
  domainAnalysis: Record<string, {
    entityCount: number;
    confidence: number;
    coverage: number;
    keyEntities: ExtractedEntity[];
  }>;
  crossDomainRelationships: CrossDomainRelationship[];
  riskAssessment: RiskAssessment;
  recommendations: string[];
}

export interface CrossDomainRelationship {
  type: string;
  entities: ExtractedEntity[];
  confidence: number;
  description: string;
}

export interface RiskAssessment {
  score: number;
  factors: string[];
} 