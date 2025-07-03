import { Config, validateConfig } from '../config';

describe('Config Validation', () => {
  describe('validateConfig', () => {
    it('should validate a valid FIBO config', () => {
      const validConfig: Config = {
        name: 'financial',
        source: {
          url: 'https://spec.edmcouncil.org/fibo/ontology',
          type: 'owl',
          version: '2024.03',
          description: 'Financial Industry Business Ontology (FIBO)'
        },
        extraction: {
          entities: {
            path: '//owl:Class[contains(@rdf:about, "fibo")]',
            name: 'substring-after(@rdf:about, "#")',
            description: '//rdfs:comment/text()'
          },
          relationships: {
            path: '//owl:ObjectProperty[contains(@rdf:about, "fibo")]',
            name: 'substring-after(@rdf:about, "#")',
            description: '//rdfs:comment/text()'
          }
        },
        overrides: {
          entities: {},
          relationships: {}
        },
        metadata: {
          lastExtraction: new Date().toISOString(),
          sourceVersion: '2024.03',
          localVersion: '1.0.0'
        }
      };

      const result = validateConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject config without required fields', () => {
      const invalidConfig = {
        name: 'financial'
        // Missing source, extraction, etc.
      };

      const result = validateConfig(invalidConfig as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('source is required');
      expect(result.errors).toContain('extraction is required');
    });

    it('should reject config with invalid source type', () => {
      const invalidConfig: Config = {
        name: 'financial',
        source: {
          url: 'https://example.com/ontology',
          type: 'invalid' as any,
          version: '1.0.0',
          description: 'Test ontology'
        },
        extraction: {
          entities: {
            path: '//test',
            name: '@id',
            description: '//description'
          },
          relationships: {
            path: '//test',
            name: '@id',
            description: '//description'
          }
        },
        overrides: {
          entities: {},
          relationships: {}
        },
        metadata: {
          lastExtraction: new Date().toISOString(),
          sourceVersion: '1.0.0',
          localVersion: '1.0.0'
        }
      };

      const result = validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('source.type must be one of: owl, rdf, json, other');
    });

    it('should reject config with invalid URL', () => {
      const invalidConfig: Config = {
        name: 'financial',
        source: {
          url: 'not-a-url',
          type: 'owl',
          version: '1.0.0',
          description: 'Test ontology'
        },
        extraction: {
          entities: {
            path: '//test',
            name: '@id',
            description: '//description'
          },
          relationships: {
            path: '//test',
            name: '@id',
            description: '//description'
          }
        },
        overrides: {
          entities: {},
          relationships: {}
        },
        metadata: {
          lastExtraction: new Date().toISOString(),
          sourceVersion: '1.0.0',
          localVersion: '1.0.0'
        }
      };

      const result = validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('source.url must be a valid URL');
    });
  });

  describe('Config loading', () => {
    it('should load config from file', () => {
      // This will be implemented when we add file loading
      expect(true).toBe(true);
    });
  });
}); 