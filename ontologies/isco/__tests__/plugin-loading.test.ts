import { iscoPlugin } from '../isco.plugin';

describe('ISCOPlugin', () => {
  describe('plugin initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(iscoPlugin.name).toBe('isco');
    });

    it('should provide ontology configuration', () => {
      expect(iscoPlugin.entitySchemas).toBeDefined();
      expect(iscoPlugin.relationshipSchemas).toBeDefined();
    });

    it('should include ISCO hierarchy entities', () => {
      const entities = iscoPlugin.entitySchemas;
      
      // Check if any ISCO-related entities exist
      const iscoEntities = Object.keys(entities).filter(name => 
        name.includes('ISCO') || name.includes('Job')
      );
      expect(iscoEntities.length).toBeGreaterThan(0);
    });
  });

  describe('entity extraction patterns', () => {
    it('should provide entity extraction configuration', () => {
      expect(iscoPlugin.entityExtraction).toBeDefined();
    });
  });

  describe('enrichment services', () => {
    it('should provide service providers if available', () => {
      // The plugin may or may not have service providers depending on register.ts
      if (iscoPlugin.serviceProviders) {
        expect(iscoPlugin.serviceProviders.register).toBeDefined();
        expect(typeof iscoPlugin.serviceProviders.register).toBe('function');
      }
    });
  });

  describe('ontology relationships', () => {
    it('should define relationships', () => {
      expect(iscoPlugin.relationshipSchemas).toBeDefined();
      if (iscoPlugin.relationshipSchemas) {
        expect(Object.keys(iscoPlugin.relationshipSchemas).length).toBeGreaterThan(0);
      }
    });
  });
}); 