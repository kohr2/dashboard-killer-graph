import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerFinancial } from './register';
import financialOntology from './ontology.json';

// Enhanced entity extraction configuration for financial domain
const financialEntityExtraction = {
  models: {
    financial: {
      type: 'finbert',
      model: 'financial-entity-recognition',
      endpoint: '/extract-financial',
      confidence: 0.7,
      priority: 1
    },
    organizations: {
      type: 'spacy',
      model: 'en_core_web_lg',
      endpoint: '/extract-orgs',
      confidence: 0.8,
      priority: 2
    }
  },
  patterns: {
    MonetaryAmount: {
      regex: '\\$[\\d,]+(?:\\.\\d{2})?',
      confidence: 0.9,
      priority: 1
    },
    Percentage: {
      regex: '\\d+(?:\\.\\d+)?%',
      confidence: 0.8,
      priority: 2
    },
    Currency: {
      regex: '\\b(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY)\\b',
      confidence: 0.95,
      priority: 1
    },
    StockSymbol: {
      regex: '\\b[A-Z]{1,5}\\b',
      confidence: 0.6,
      priority: 3
    }
  },
  contextRules: {
    'financial-report': {
      priority: ['MonetaryAmount', 'Organization', 'Date', 'Percentage', 'Currency'],
      requiredModels: ['financial', 'organizations'],
      confidenceThreshold: 0.7
    },
    'earnings-call': {
      priority: ['Organization', 'Person', 'MonetaryAmount', 'Percentage'],
      requiredModels: ['financial', 'organizations'],
      confidenceThreshold: 0.6
    },
    'investment-memo': {
      priority: ['Organization', 'MonetaryAmount', 'Percentage', 'StockSymbol'],
      requiredModels: ['financial'],
      confidenceThreshold: 0.8
    }
  },
  enrichment: {
    Organization: {
      services: ['edgar', 'openCorporates'],
      properties: ['industry', 'sector', 'employees', 'revenue', 'founded', 'ticker']
    },
    Person: {
      services: ['linkedin', 'edgar'],
      properties: ['title', 'company', 'role', 'compensation']
    },
    MonetaryAmount: {
      services: ['currency-converter', 'inflation-adjuster'],
      properties: ['currency', 'normalizedValue', 'inflationAdjusted', 'year']
    },
    StockSymbol: {
      services: ['yahoo-finance', 'alpha-vantage'],
      properties: ['companyName', 'currentPrice', 'marketCap', 'sector']
    }
  }
};

// Enhance entities with entity extraction configuration
const enhancedEntities = {
  ...financialOntology.entities
  // Organization entity is now provided by CRM ontology dependency
  // No need to enhance it here as it's handled by the CRM plugin
};

export const financialPlugin: OntologyPlugin = {
  name: 'financial',
  entitySchemas: enhancedEntities,
  relationshipSchemas: financialOntology.relationships,
  reasoning: financialOntology.reasoning,
  serviceProviders: {
    register: registerFinancial,
  },
}; 