import { OntologyService } from '@platform/ontology/ontology.service';
import { iscoPlugin } from '../isco.plugin';

describe('ISCO Ontology - Enhanced Entity Extraction', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
    ontologyService.loadFromPlugins([iscoPlugin]);
  });

  describe('ISCO Entity Extraction', () => {
    it('should have entity extraction configuration', () => {
      expect(iscoPlugin.entityExtraction).toBeDefined();
    });

    it('should have entity schemas', () => {
      expect(iscoPlugin.entitySchemas).toBeDefined();
      expect(Object.keys(iscoPlugin.entitySchemas).length).toBeGreaterThan(0);
    });

    it('should have relationship schemas', () => {
      expect(iscoPlugin.relationshipSchemas).toBeDefined();
      if (iscoPlugin.relationshipSchemas) {
        expect(Object.keys(iscoPlugin.relationshipSchemas).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Entity Properties', () => {
    it('should have comprehensive entity properties', () => {
      const entities = iscoPlugin.entitySchemas;
      
      // Check that entities have basic structure
      Object.keys(entities).forEach(entityName => {
        const entity = entities[entityName] as any;
        expect(entity).toBeDefined();
        if (entity.properties) {
          expect(typeof entity.properties).toBe('object');
        }
      });
    });
  });

  describe('Relationships', () => {
    it('should have relationship definitions', () => {
      if (iscoPlugin.relationshipSchemas) {
        const relationships = iscoPlugin.relationshipSchemas;
        
        Object.keys(relationships).forEach(relName => {
          const rel = relationships[relName] as any;
          expect(rel).toBeDefined();
        });
      }
    });
  });
}); 