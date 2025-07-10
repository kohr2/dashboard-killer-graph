import { OntologyPlugin } from '@/types/ontology';
import { Entity, Property, Relationship, EntityExtractionPattern, EnrichmentService } from '@/types/ontology';

export const CompaniesPlugin: OntologyPlugin = {
  name: 'companies',
  version: '1.0.0',
  description: 'Company and business organization ontology for identifying and classifying companies, industries, and business entities',
  
  entities: [
    {
      id: 'Company',
      name: 'Company',
      description: 'A business organization or corporation',
      properties: [
        { name: 'name', type: 'string', description: 'Company name' },
        { name: 'ticker', type: 'string', description: 'Stock ticker symbol' },
        { name: 'cik', type: 'string', description: 'Central Index Key (SEC identifier)' },
        { name: 'founded', type: 'date', description: 'Company founding date' },
        { name: 'headquarters', type: 'string', description: 'Company headquarters location' },
        { name: 'website', type: 'string', description: 'Company website URL' },
        { name: 'description', type: 'text', description: 'Company description' },
        { name: 'marketCap', type: 'number', description: 'Market capitalization' },
        { name: 'employees', type: 'number', description: 'Number of employees' },
        { name: 'revenue', type: 'number', description: 'Annual revenue' },
        { name: 'lei', type: 'string', description: 'Legal Entity Identifier' }
      ]
    },
    {
      id: 'Industry',
      name: 'Industry',
      description: 'A specific business industry or sector',
      properties: [
        { name: 'name', type: 'string', description: 'Industry name' },
        { name: 'code', type: 'string', description: 'Industry classification code' },
        { name: 'description', type: 'text', description: 'Industry description' },
        { name: 'parentIndustry', type: 'string', description: 'Parent industry if applicable' }
      ]
    },
    {
      id: 'Sector',
      name: 'Sector',
      description: 'A broad business sector category',
      properties: [
        { name: 'name', type: 'string', description: 'Sector name' },
        { name: 'code', type: 'string', description: 'Sector classification code' },
        { name: 'description', type: 'text', description: 'Sector description' }
      ]
    },
    {
      id: 'BusinessType',
      name: 'BusinessType',
      description: 'Type of business organization',
      properties: [
        { name: 'name', type: 'string', description: 'Business type name' },
        { name: 'description', type: 'text', description: 'Business type description' },
        { name: 'legalStructure', type: 'string', description: 'Legal structure type' }
      ]
    },
    {
      id: 'CompanySize',
      name: 'CompanySize',
      description: 'Classification of company size',
      properties: [
        { name: 'name', type: 'string', description: 'Size category name' },
        { name: 'description', type: 'text', description: 'Size category description' },
        { name: 'employeeRange', type: 'string', description: 'Employee count range' },
        { name: 'revenueRange', type: 'string', description: 'Revenue range' }
      ]
    },
    {
      id: 'StockExchange',
      name: 'StockExchange',
      description: 'Stock exchange where company is listed',
      properties: [
        { name: 'name', type: 'string', description: 'Exchange name' },
        { name: 'code', type: 'string', description: 'Exchange code' },
        { name: 'country', type: 'string', description: 'Exchange country' },
        { name: 'description', type: 'text', description: 'Exchange description' }
      ]
    }
  ],

  relationships: [
    {
      id: 'BELONGS_TO_INDUSTRY',
      name: 'BELONGS_TO_INDUSTRY',
      description: 'Company belongs to a specific industry',
      sourceEntity: 'Company',
      targetEntity: 'Industry',
      properties: [
        { name: 'primary', type: 'boolean', description: 'Whether this is the primary industry' },
        { name: 'percentage', type: 'number', description: 'Percentage of business in this industry' }
      ]
    },
    {
      id: 'BELONGS_TO_SECTOR',
      name: 'BELONGS_TO_SECTOR',
      description: 'Company belongs to a specific sector',
      sourceEntity: 'Company',
      targetEntity: 'Sector',
      properties: [
        { name: 'primary', type: 'boolean', description: 'Whether this is the primary sector' }
      ]
    },
    {
      id: 'HAS_BUSINESS_TYPE',
      name: 'HAS_BUSINESS_TYPE',
      description: 'Company has a specific business type',
      sourceEntity: 'Company',
      targetEntity: 'BusinessType',
      properties: []
    },
    {
      id: 'HAS_SIZE',
      name: 'HAS_SIZE',
      description: 'Company has a specific size classification',
      sourceEntity: 'Company',
      targetEntity: 'CompanySize',
      properties: [
        { name: 'asOfDate', type: 'date', description: 'Date of size classification' }
      ]
    },
    {
      id: 'LISTED_ON',
      name: 'LISTED_ON',
      description: 'Company is listed on a stock exchange',
      sourceEntity: 'Company',
      targetEntity: 'StockExchange',
      properties: [
        { name: 'ticker', type: 'string', description: 'Ticker symbol on this exchange' },
        { name: 'listingDate', type: 'date', description: 'Date of listing' },
        { name: 'active', type: 'boolean', description: 'Whether listing is currently active' }
      ]
    },
    {
      id: 'SUBSIDIARY_OF',
      name: 'SUBSIDIARY_OF',
      description: 'Company is a subsidiary of another company',
      sourceEntity: 'Company',
      targetEntity: 'Company',
      properties: [
        { name: 'ownershipPercentage', type: 'number', description: 'Percentage ownership' },
        { name: 'relationshipType', type: 'string', description: 'Type of subsidiary relationship' }
      ]
    },
    {
      id: 'COMPETES_WITH',
      name: 'COMPETES_WITH',
      description: 'Company competes with another company',
      sourceEntity: 'Company',
      targetEntity: 'Company',
      properties: [
        { name: 'competitionLevel', type: 'string', description: 'Level of competition' },
        { name: 'marketOverlap', type: 'number', description: 'Market overlap percentage' }
      ]
    },
    {
      id: 'INDUSTRY_BELONGS_TO_SECTOR',
      name: 'INDUSTRY_BELONGS_TO_SECTOR',
      description: 'Industry belongs to a sector',
      sourceEntity: 'Industry',
      targetEntity: 'Sector',
      properties: []
    }
  ],

  entityExtractionPatterns: [
    {
      entityType: 'Company',
      patterns: [
        {
          name: 'company_name_with_ticker',
          pattern: '\\b([A-Z][a-zA-Z\\s&.,]+)\\s*\\(([A-Z]{1,5})\\)',
          description: 'Company name followed by ticker symbol in parentheses'
        },
        {
          name: 'ticker_symbol',
          pattern: '\\b[A-Z]{1,5}\\b',
          description: 'Standalone ticker symbol (3-5 capital letters)'
        },
        {
          name: 'company_name_capitalized',
          pattern: '\\b[A-Z][a-zA-Z\\s&.,]{2,50}\\b',
          description: 'Capitalized company names'
        },
        {
          name: 'inc_corp_llc',
          pattern: '\\b[A-Z][a-zA-Z\\s&.,]+\\s+(Inc|Corp|LLC|Ltd|Company|Co)\\b',
          description: 'Company names ending with business suffixes'
        }
      ]
    },
    {
      entityType: 'Industry',
      patterns: [
        {
          name: 'industry_terms',
          pattern: '\\b(Technology|Healthcare|Finance|Manufacturing|Retail|Energy|Transportation|Telecommunications|Media|Real Estate|Agriculture|Mining|Construction|Education|Entertainment|Food|Automotive|Aerospace|Pharmaceuticals|Biotechnology)\\b',
          description: 'Common industry terms'
        }
      ]
    },
    {
      entityType: 'Sector',
      patterns: [
        {
          name: 'sector_terms',
          pattern: '\\b(Technology|Healthcare|Financial|Consumer|Industrial|Energy|Materials|Utilities|Communication Services|Real Estate)\\b',
          description: 'Common sector terms'
        }
      ]
    }
  ],

  enrichmentServices: [
    {
      name: 'company_info_enrichment',
      description: 'Enriches company entities with additional information from S&P 500 dataset',
      inputEntityTypes: ['Company'],
      outputProperties: ['ticker', 'cik', 'industry', 'sector', 'description'],
      serviceType: 'dataset_lookup'
    },
    {
      name: 'industry_classification',
      description: 'Classifies companies into industries based on their business description',
      inputEntityTypes: ['Company'],
      outputProperties: ['industry', 'sector'],
      serviceType: 'classification'
    },
    {
      name: 'company_relationships',
      description: 'Identifies relationships between companies (subsidiaries, competitors)',
      inputEntityTypes: ['Company'],
      outputProperties: ['subsidiaries', 'competitors', 'parent_company'],
      serviceType: 'relationship_extraction'
    },
    {
      name: 'financial_data_enrichment',
      description: 'Enriches companies with financial data (market cap, revenue, employees)',
      inputEntityTypes: ['Company'],
      outputProperties: ['marketCap', 'revenue', 'employees'],
      serviceType: 'financial_api'
    }
  ],

  validationRules: [
    {
      name: 'company_name_required',
      description: 'Company entities must have a name',
      rule: 'entity.properties.name IS NOT NULL AND entity.properties.name != ""'
    },
    {
      name: 'ticker_format',
      description: 'Ticker symbols should be 1-5 capital letters',
      rule: 'entity.properties.ticker MATCHES "^[A-Z]{1,5}$"'
    },
    {
      name: 'cik_format',
      description: 'CIK should be a 10-digit number',
      rule: 'entity.properties.cik MATCHES "^[0-9]{10}$"'
    }
  ]
};

export default CompaniesPlugin; 