import { ISCOPlugin } from '../isco.plugin';

describe('ISCOPlugin', () => {
  let plugin: ISCOPlugin;

  beforeEach(() => {
    plugin = new ISCOPlugin();
  });

  describe('plugin initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(plugin.name).toBe('isco');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.description).toContain('International Standard Classification of Occupations');
    });

    it('should provide ontology configuration', () => {
      const ontology = plugin.getOntology();
      
      expect(ontology).toBeDefined();
      expect(ontology.entities).toBeDefined();
      expect(ontology.relationships).toBeDefined();
    });

    it('should include ISCO hierarchy entities', () => {
      const ontology = plugin.getOntology();
      
      expect(ontology.entities.ISCOMajorGroup).toBeDefined();
      expect(ontology.entities.ISCOSubMajorGroup).toBeDefined();
      expect(ontology.entities.ISCOMinorGroup).toBeDefined();
      expect(ontology.entities.ISCOUnitGroup).toBeDefined();
      expect(ontology.entities.ISCOGroup).toBeDefined();
    });

    it('should include job-related entities', () => {
      const ontology = plugin.getOntology();
      
      expect(ontology.entities.JobTitle).toBeDefined();
      expect(ontology.entities.JobLevel).toBeDefined();
      expect(ontology.entities.JobFunction).toBeDefined();
      expect(ontology.entities.JobDepartment).toBeDefined();
    });
  });

  describe('entity extraction patterns', () => {
    it('should provide job title extraction patterns', () => {
      const patterns = plugin.getEntityExtractionPatterns();
      
      expect(patterns.JobTitle).toBeDefined();
      expect(patterns.JobTitle.length).toBeGreaterThan(0);
      
      // Check that patterns have required properties
      patterns.JobTitle.forEach(pattern => {
        expect(pattern.pattern).toBeDefined();
        expect(pattern.confidence).toBeDefined();
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should provide ISCO group extraction patterns', () => {
      const patterns = plugin.getEntityExtractionPatterns();
      
      expect(patterns.ISCOGroup).toBeDefined();
      expect(patterns.ISCOGroup.length).toBeGreaterThan(0);
      
      // Check that patterns have required properties
      patterns.ISCOGroup.forEach(pattern => {
        expect(pattern.pattern).toBeDefined();
        expect(pattern.confidence).toBeDefined();
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('enrichment services', () => {
    it('should provide enrichment services', () => {
      const services = plugin.getEnrichmentServices();
      
      expect(services).toBeDefined();
      expect(services.length).toBeGreaterThan(0);
      
      services.forEach(service => {
        expect(service.name).toBeDefined();
        expect(service.description).toBeDefined();
        expect(service.service).toBeDefined();
        expect(typeof service.service).toBe('function');
      });
    });

    it('should include ISCO classification service', () => {
      const services = plugin.getEnrichmentServices();
      
      const iscoService = services.find(service => service.name === 'isco-classification');
      expect(iscoService).toBeDefined();
      expect(iscoService?.description).toContain('ISCO standards');
    });

    it('should include job hierarchy enrichment service', () => {
      const services = plugin.getEnrichmentServices();
      
      const hierarchyService = services.find(service => service.name === 'job-hierarchy-enrichment');
      expect(hierarchyService).toBeDefined();
      expect(hierarchyService?.description).toContain('hierarchical information');
    });
  });

  describe('entity extractor', () => {
    it('should provide entity extractor', () => {
      const extractor = plugin.getEntityExtractor();
      
      expect(extractor).toBeDefined();
      expect(extractor.extract).toBeDefined();
      expect(typeof extractor.extract).toBe('function');
    });

    it('should extract job titles from text', async () => {
      const extractor = plugin.getEntityExtractor();
      const text = 'We are hiring a Senior Software Engineer and a Data Scientist.';
      
      const entities = await extractor.extract(text);
      
      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);
      
      const jobTitleEntities = entities.filter(entity => entity.type === 'JobTitle');
      expect(jobTitleEntities.length).toBeGreaterThan(0);
    });

    it('should extract ISCO groups from text', async () => {
      const extractor = plugin.getEntityExtractor();
      const text = 'This position falls under ISCO Group 2511 and ISCO Code 2512.';
      
      const entities = await extractor.extract(text);
      
      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);
      
      const iscoEntities = entities.filter(entity => entity.type === 'ISCOGroup');
      expect(iscoEntities.length).toBeGreaterThan(0);
    });

    it('should return entities with correct structure', async () => {
      const extractor = plugin.getEntityExtractor();
      const text = 'Senior Software Engineer position available.';
      
      const entities = await extractor.extract(text);
      
      if (entities.length > 0) {
        const entity = entities[0];
        expect(entity.type).toBeDefined();
        expect(entity.value).toBeDefined();
        expect(entity.confidence).toBeDefined();
        expect(entity.start).toBeDefined();
        expect(entity.end).toBeDefined();
        
        expect(entity.confidence).toBeGreaterThan(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
        expect(entity.start).toBeGreaterThanOrEqual(0);
        expect(entity.end).toBeGreaterThan(entity.start);
      }
    });
  });

  describe('ontology relationships', () => {
    it('should define ISCO hierarchy relationships', () => {
      const ontology = plugin.getOntology();
      
      expect(ontology.relationships.ISCO_GROUP_PARENT).toBeDefined();
      expect(ontology.relationships.ISCO_GROUP_TYPE).toBeDefined();
    });

    it('should define job title mapping relationships', () => {
      const ontology = plugin.getOntology();
      
      expect(ontology.relationships.MAPPED_TO_ISCO).toBeDefined();
      expect(ontology.relationships.BELONGS_TO_LEVEL).toBeDefined();
      expect(ontology.relationships.BELONGS_TO_FUNCTION).toBeDefined();
      expect(ontology.relationships.BELONGS_TO_DEPARTMENT).toBeDefined();
    });
  });
}); 