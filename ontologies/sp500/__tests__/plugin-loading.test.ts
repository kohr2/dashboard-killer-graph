import { sp500Plugin } from '../sp500.plugin';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';

describe('SP500 Plugin', () => {
  it('should export a valid OntologyPlugin', () => {
    expect(sp500Plugin).toBeDefined();
    expect(typeof sp500Plugin).toBe('object');
  });

  it('should have the correct name', () => {
    expect(sp500Plugin.name).toBe('sp500');
  });

  it('should have entity schemas', () => {
    expect(sp500Plugin.entitySchemas).toBeDefined();
    expect(typeof sp500Plugin.entitySchemas).toBe('object');
  });

  it('should have relationship schemas', () => {
    expect(sp500Plugin.relationshipSchemas).toBeDefined();
    expect(typeof sp500Plugin.relationshipSchemas).toBe('object');
  });

  it('should have entity extraction patterns', () => {
    expect(sp500Plugin.entityExtraction).toBeDefined();
    expect(typeof sp500Plugin.entityExtraction).toBe('object');
  });

  it('should have reasoning algorithms', () => {
    expect(sp500Plugin.reasoning).toBeDefined();
    expect(sp500Plugin.reasoning?.algorithms).toBeDefined();
  });

  describe('Entity Schemas', () => {
    it('should have entity schemas defined', () => {
      const entities = sp500Plugin.entitySchemas;
      expect(Object.keys(entities).length).toBeGreaterThan(0);
    });
  });

  describe('Relationship Schemas', () => {
    it('should have relationship schemas defined', () => {
      if (sp500Plugin.relationshipSchemas) {
        const relationships = sp500Plugin.relationshipSchemas;
        expect(Object.keys(relationships).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Entity Extraction Patterns', () => {
    it('should have entity extraction patterns defined', () => {
      if (sp500Plugin.entityExtraction) {
        const patterns = sp500Plugin.entityExtraction;
        expect(Object.keys(patterns).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Reasoning Algorithms', () => {
    it('should have reasoning algorithms defined', () => {
      if (sp500Plugin.reasoning?.algorithms) {
        const algorithms = sp500Plugin.reasoning.algorithms;
        expect(Object.keys(algorithms).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Plugin Interface Compliance', () => {
    it('should implement OntologyPlugin interface', () => {
      const plugin: OntologyPlugin = sp500Plugin;
      expect(plugin.name).toBe('sp500');
      expect(plugin.entitySchemas).toBeDefined();
      expect(plugin.relationshipSchemas).toBeDefined();
      expect(plugin.entityExtraction).toBeDefined();
      expect(plugin.reasoning).toBeDefined();
    });
  });
}); 