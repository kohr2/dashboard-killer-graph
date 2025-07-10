import { companiesPlugin } from '../companies.plugin';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';

describe('Companies Plugin', () => {
  it('should export a valid OntologyPlugin', () => {
    expect(companiesPlugin).toBeDefined();
    expect(typeof companiesPlugin).toBe('object');
  });

  it('should have the correct name', () => {
    expect(companiesPlugin.name).toBe('companies');
  });

  it('should have entity schemas', () => {
    expect(companiesPlugin.entitySchemas).toBeDefined();
    expect(typeof companiesPlugin.entitySchemas).toBe('object');
  });

  it('should have relationship schemas', () => {
    expect(companiesPlugin.relationshipSchemas).toBeDefined();
    expect(typeof companiesPlugin.relationshipSchemas).toBe('object');
  });

  it('should have entity extraction patterns', () => {
    expect(companiesPlugin.entityExtraction).toBeDefined();
    expect(typeof companiesPlugin.entityExtraction).toBe('object');
  });

  it('should have reasoning algorithms', () => {
    expect(companiesPlugin.reasoning).toBeDefined();
    expect(companiesPlugin.reasoning?.algorithms).toBeDefined();
  });

  describe('Entity Schemas', () => {
    it('should have Company entity', () => {
      const companySchema = companiesPlugin.entitySchemas.Company as any;
      expect(companySchema).toBeDefined();
      expect(companySchema.id).toBe('Company');
      expect(companySchema.name).toBe('Company');
      expect(companySchema.properties).toBeDefined();
      expect(Array.isArray(companySchema.properties)).toBe(true);
    });

    it('should have Industry entity', () => {
      const industrySchema = companiesPlugin.entitySchemas.Industry as any;
      expect(industrySchema).toBeDefined();
      expect(industrySchema.id).toBe('Industry');
      expect(industrySchema.name).toBe('Industry');
    });

    it('should have Sector entity', () => {
      const sectorSchema = companiesPlugin.entitySchemas.Sector as any;
      expect(sectorSchema).toBeDefined();
      expect(sectorSchema.id).toBe('Sector');
      expect(sectorSchema.name).toBe('Sector');
    });

    it('should have BusinessType entity', () => {
      const businessTypeSchema = companiesPlugin.entitySchemas.BusinessType as any;
      expect(businessTypeSchema).toBeDefined();
      expect(businessTypeSchema.id).toBe('BusinessType');
      expect(businessTypeSchema.name).toBe('BusinessType');
    });

    it('should have CompanySize entity', () => {
      const companySizeSchema = companiesPlugin.entitySchemas.CompanySize as any;
      expect(companySizeSchema).toBeDefined();
      expect(companySizeSchema.id).toBe('CompanySize');
      expect(companySizeSchema.name).toBe('CompanySize');
    });

    it('should have StockExchange entity', () => {
      const stockExchangeSchema = companiesPlugin.entitySchemas.StockExchange as any;
      expect(stockExchangeSchema).toBeDefined();
      expect(stockExchangeSchema.id).toBe('StockExchange');
      expect(stockExchangeSchema.name).toBe('StockExchange');
    });
  });

  describe('Relationship Schemas', () => {
    it('should have BELONGS_TO_INDUSTRY relationship', () => {
      const relationship = companiesPlugin.relationshipSchemas?.BELONGS_TO_INDUSTRY as any;
      expect(relationship).toBeDefined();
      expect(relationship?.sourceEntity).toBe('Company');
      expect(relationship?.targetEntity).toBe('Industry');
    });

    it('should have BELONGS_TO_SECTOR relationship', () => {
      const relationship = companiesPlugin.relationshipSchemas?.BELONGS_TO_SECTOR as any;
      expect(relationship).toBeDefined();
      expect(relationship?.sourceEntity).toBe('Company');
      expect(relationship?.targetEntity).toBe('Sector');
    });

    it('should have LISTED_ON relationship', () => {
      const relationship = companiesPlugin.relationshipSchemas?.LISTED_ON as any;
      expect(relationship).toBeDefined();
      expect(relationship?.sourceEntity).toBe('Company');
      expect(relationship?.targetEntity).toBe('StockExchange');
    });

    it('should have SUBSIDIARY_OF relationship', () => {
      const relationship = companiesPlugin.relationshipSchemas?.SUBSIDIARY_OF as any;
      expect(relationship).toBeDefined();
      expect(relationship?.sourceEntity).toBe('Company');
      expect(relationship?.targetEntity).toBe('Company');
    });

    it('should have COMPETES_WITH relationship', () => {
      const relationship = companiesPlugin.relationshipSchemas?.COMPETES_WITH as any;
      expect(relationship).toBeDefined();
      expect(relationship?.sourceEntity).toBe('Company');
      expect(relationship?.targetEntity).toBe('Company');
    });
  });

  describe('Entity Extraction Patterns', () => {
    it('should have Company extraction patterns', () => {
      const patterns = companiesPlugin.entityExtraction?.Company as any;
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns?.length).toBeGreaterThan(0);
    });

    it('should have Industry extraction patterns', () => {
      const patterns = companiesPlugin.entityExtraction?.Industry;
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should have Sector extraction patterns', () => {
      const patterns = companiesPlugin.entityExtraction?.Sector;
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('Reasoning Algorithms', () => {
    it('should have company_industry_classification algorithm', () => {
      const algorithm = companiesPlugin.reasoning?.algorithms?.company_industry_classification;
      expect(algorithm).toBeDefined();
      expect(algorithm?.name).toBe('Company Industry Classification');
      expect(algorithm?.entityType).toBe('Company');
    });

    it('should have company_size_classification algorithm', () => {
      const algorithm = companiesPlugin.reasoning?.algorithms?.company_size_classification;
      expect(algorithm).toBeDefined();
      expect(algorithm?.name).toBe('Company Size Classification');
      expect(algorithm?.entityType).toBe('Company');
    });

    it('should have competitor_identification algorithm', () => {
      const algorithm = companiesPlugin.reasoning?.algorithms?.competitor_identification;
      expect(algorithm).toBeDefined();
      expect(algorithm?.name).toBe('Competitor Identification');
      expect(algorithm?.entityType).toBe('Company');
    });
  });

  describe('Plugin Interface Compliance', () => {
    it('should implement OntologyPlugin interface', () => {
      const plugin: OntologyPlugin = companiesPlugin;
      expect(plugin.name).toBe('companies');
      expect(plugin.entitySchemas).toBeDefined();
      expect(plugin.relationshipSchemas).toBeDefined();
      expect(plugin.entityExtraction).toBeDefined();
      expect(plugin.reasoning).toBeDefined();
    });
  });
}); 