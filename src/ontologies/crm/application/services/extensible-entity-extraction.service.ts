// Extensible Entity Extraction Service
// Integrates with core CRM and domain extensions (Financial/FIBO, Healthcare, Legal, etc.)

import { EntityExtractionService, EntityExtractionResult, ExtractedEntity } from './entity-extraction.service';
import { SpacyEntityExtractionService, SpacyEntityExtractionResult, SpacyExtractedEntity, EntityType } from './spacy-entity-extraction.service';
import { OCreamV2Ontology, KnowledgeType, ActivityType } from '../../domain/ontology/o-cream-v2';
import { logger } from '@shared/utils/logger';

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
  extract: (text: string, context?: unknown) => Promise<ExtractedEntity[]>;
}

export interface ValidationRule {
  type: 'format' | 'range' | 'context' | 'custom';
  rule: string | RegExp | ((value: string, context?: unknown) => boolean);
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

export interface ExtensionInsights {
  [key: string]: unknown;
}

export interface ExtensionEntityExtractionResult extends EntityExtractionResult {
  extensionResults: Record<string, ExtractedEntity[]>;
  knowledgeElements: unknown[];
  insights: ExtensionInsights;
}

export class ExtensibleEntityExtractionService extends EntityExtractionService {
  private coreExtractor: SpacyEntityExtractionService;
  private ontology: OCreamV2Ontology;
  private extensionRegistry: Map<string, ExtensionEntityRegistry>;

  constructor() {
    super();
    this.coreExtractor = new SpacyEntityExtractionService();
    this.ontology = OCreamV2Ontology.getInstance();
    this.extensionRegistry = new Map<string, ExtensionEntityRegistry>();
  }

  public registerExtension(extension: ExtensionEntityRegistry): void {
    if (this.extensionRegistry.has(extension.extensionName)) {
      logger.warn(`⚠️ Extension "${extension.extensionName}" is already registered. Overwriting.`);
    }
    this.extensionRegistry.set(extension.extensionName, extension);
    logger.info(`📦 Registered extension: ${extension.extensionName} with ${extension.entityTypes.length} entity types`);
  }

  public async extractEntities(text: string, options?: unknown): Promise<EntityExtractionResult> {
    const result = await this.coreExtractor.extractEntities(text, options);
    return {
        entities: result.entities,
        entityCount: result.entities.length,
        language: result.metadata.languageDetected || 'en',
        processingTimeMs: result.processingTime,
        modelUsed: result.metadata.nlpModel
    };
  }

  public async extractEntitiesWithExtensions(
    text: string,
    options?: {
      enabledExtensions?: string[];
      coreModel?: 'en_core_web_sm' | 'en_core_web_lg' | 'en_core_web_trf';
      contextMetadata?: unknown;
    }
  ): Promise<ExtensionEntityExtractionResult> {
    
    const startTime = Date.now();
    const coreResult: SpacyEntityExtractionResult = await this.coreExtractor.extractEntities(text, {
      model: options?.coreModel,
    });

    const extensionResults: Record<string, ExtractedEntity[]> = {};
    
    // This is a placeholder for a real extension mechanism
    // In a real scenario, you'd loop through enabled extensions and call them.
    
    const allEntities = [...coreResult.entities];

    return {
      entities: allEntities,
      entityCount: allEntities.length,
      language: coreResult.metadata.languageDetected || 'en',
      processingTimeMs: Date.now() - startTime,
      modelUsed: coreResult.metadata.nlpModel,
      extensionResults,
      knowledgeElements: [],
      insights: {}
    };
  }
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