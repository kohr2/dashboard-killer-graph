import { EnhancedEntityExtractionService } from '../enhanced-entity-extraction.service';
import { OntologyService } from '../../ontology/ontology.service';

// Mock OntologyService
jest.mock('../../ontology/ontology.service');
jest.mock('axios');

const mockOntologyService = {
  getInstance: jest.fn(),
  getEntitySchema: jest.fn()
};

// Mock the static method properly
jest.mocked(OntologyService.getInstance).mockReturnValue(mockOntologyService);

describe('EnhancedEntityExtractionService - Financial Domain', () => {
  let service: EnhancedEntityExtractionService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock financial ontology configuration
    mockOntologyService.getEntitySchema.mockReturnValue({
      entityExtraction: {
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
      }
    });

    service = new EnhancedEntityExtractionService();
  });

  describe('Financial Report Context', () => {
    it('should extract financial entities from earnings report', async () => {
      const text = 'Apple Inc. reported Q4 revenue of $89.5 billion, up 8.1% year-over-year. EPS was $1.29.';
      const context = 'financial-report';

      // Mock ML model responses
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: 'Apple Inc.',
              type: 'Organization',
              confidence: 0.85,
              position: { start: 0, end: 9 }
            }
          ]
        }
      });

      const entities = await service.extractEntities(text, context);

      expect(entities).toHaveLength(4); // Organization + 3 MonetaryAmount/Percentage
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'Organization',
          name: 'Apple Inc.',
          confidence: 0.85
        })
      );
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'MonetaryAmount',
          name: '$89.5 billion',
          confidence: 0.9
        })
      );
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'Percentage',
          name: '8.1%',
          confidence: 0.8
        })
      );
    });

    it('should extract stock symbols and currencies', async () => {
      const text = 'AAPL stock is trading at $150.25 USD. TSLA is at $200.50.';
      const context = 'financial-report';

      const entities = await service.extractEntities(text, context);

      expect(entities).toHaveLength(6); // 2 StockSymbol + 2 MonetaryAmount + 1 Currency + 1 Organization
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'StockSymbol',
          name: 'AAPL',
          confidence: 0.6
        })
      );
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'Currency',
          name: 'USD',
          confidence: 0.95
        })
      );
    });
  });

  describe('Earnings Call Context', () => {
    it('should prioritize person and organization entities', async () => {
      const text = 'Tim Cook, CEO of Apple, announced 15% growth in services revenue.';
      const context = 'earnings-call';

      // Mock ML model responses
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: 'Tim Cook',
              type: 'Person',
              confidence: 0.9,
              position: { start: 0, end: 9 }
            },
            {
              text: 'Apple',
              type: 'Organization',
              confidence: 0.85,
              position: { start: 15, end: 20 }
            }
          ]
        }
      });

      const entities = await service.extractEntities(text, context);

      // Should prioritize Person and Organization first
      expect(entities[0].type).toBe('Person');
      expect(entities[1].type).toBe('Organization');
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'Percentage',
          name: '15%',
          confidence: 0.8
        })
      );
    });
  });

  describe('Investment Memo Context', () => {
    it('should focus on financial metrics and stock symbols', async () => {
      const text = 'MSFT shows strong fundamentals with $50B revenue and 20% growth.';
      const context = 'investment-memo';

      // Mock ML model responses
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          entities: [
            {
              text: 'MSFT',
              type: 'StockSymbol',
              confidence: 0.7,
              position: { start: 0, end: 4 }
            }
          ]
        }
      });

      const entities = await service.extractEntities(text, context);

      expect(entities).toHaveLength(3); // StockSymbol + MonetaryAmount + Percentage
      expect(entities[0].type).toBe('StockSymbol');
      expect(entities).toContainEqual(
        expect.objectContaining({
          type: 'MonetaryAmount',
          name: '$50B',
          confidence: 0.9
        })
      );
    });
  });

  describe('Entity Enrichment', () => {
    it('should enrich organization entities with financial data', async () => {
      const entity = {
        id: 'org-123',
        name: 'Apple Inc.',
        type: 'Organization',
        confidence: 0.8,
        source: 'spacy-en_core_web_lg'
      };

      // Mock enrichment service responses
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          industry: 'Technology',
          sector: 'Consumer Electronics',
          employees: 164000,
          revenue: 394328000000,
          founded: 1976,
          ticker: 'AAPL'
        }
      });

      const enriched = await service['enrichEntity'](entity, {
        services: ['edgar', 'openCorporates'],
        properties: ['industry', 'sector', 'employees', 'revenue', 'founded', 'ticker']
      });

      expect(enriched.properties).toEqual({
        industry: 'Technology',
        sector: 'Consumer Electronics',
        employees: 164000,
        revenue: 394328000000,
        founded: 1976,
        ticker: 'AAPL'
      });
      expect(enriched.confidence).toBe(0.9); // Boosted confidence
    });

    it('should enrich monetary amounts with currency conversion', async () => {
      const entity = {
        id: 'amount-123',
        name: '$100M',
        type: 'MonetaryAmount',
        confidence: 0.9,
        source: 'regex-MonetaryAmount'
      };

      // Mock currency conversion service
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValueOnce({
        data: {
          currency: 'USD',
          normalizedValue: 100000000,
          inflationAdjusted: 95000000,
          year: 2024
        }
      });

      const enriched = await service['enrichEntity'](entity, {
        services: ['currency-converter', 'inflation-adjuster'],
        properties: ['currency', 'normalizedValue', 'inflationAdjusted', 'year']
      });

      expect(enriched.properties).toEqual({
        currency: 'USD',
        normalizedValue: 100000000,
        inflationAdjusted: 95000000,
        year: 2024
      });
    });
  });

  describe('Configuration Management', () => {
    it('should load financial-specific extraction configuration', () => {
      const config = service.getExtractionConfig();

      expect(config.models.financial).toBeDefined();
      expect(config.models.financial.type).toBe('finbert');
      expect(config.patterns.MonetaryAmount).toBeDefined();
      expect(config.contextRules['financial-report']).toBeDefined();
      expect(config.enrichment.Organization).toBeDefined();
    });

    it('should allow dynamic updates to financial patterns', () => {
      const newPattern = {
        regex: '\\b\\d{1,3}(?:,\\d{3})*\\s*million\\b',
        confidence: 0.85,
        priority: 2
      };

      service.updateExtractionConfig({
        patterns: {
          MillionAmount: newPattern
        }
      });

      const config = service.getExtractionConfig();
      expect(config.patterns.MillionAmount).toEqual(newPattern);
    });
  });
}); 