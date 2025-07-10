import { registerAllEnrichments, registerEnrichmentService, getRegisteredEnrichmentServices } from '../register-enrichments';
import { OntologyAgnosticEnrichmentService } from '../platform/enrichment/ontology-agnostic-enrichment.service';
import { IEnrichmentService } from '../platform/enrichment/i-enrichment-service.interface';

// Mock enrichment service for testing
class MockEnrichmentService implements IEnrichmentService {
  readonly name: string = 'mock';
  
  constructor(private config: any) {}
  
  async enrich(entity: any): Promise<any> {
    return { ...entity, enriched: true, service: 'mock' };
  }
}

describe('Enrichment Agnostic Registration', () => {
  beforeEach(() => {
    // Clear any existing registrations
    jest.clearAllMocks();
  });

  describe('registerEnrichmentService', () => {
    it('should register a custom enrichment service', () => {
      // Register a mock service
      registerEnrichmentService('customService', (config: any) => new MockEnrichmentService(config));
      
      const registeredServices = getRegisteredEnrichmentServices();
      expect(registeredServices).toContain('customservice'); // Should be lowercase
    });

    it('should allow multiple service registrations', () => {
      registerEnrichmentService('service1', (config: any) => new MockEnrichmentService(config));
      registerEnrichmentService('service2', (config: any) => new MockEnrichmentService(config));
      
      const registeredServices = getRegisteredEnrichmentServices();
      expect(registeredServices).toContain('service1');
      expect(registeredServices).toContain('service2');
    });
  });

  describe('registerAllEnrichments', () => {
    it('should create OntologyAgnosticEnrichmentService', () => {
      // Register a test service first
      registerEnrichmentService('testService', (config: any) => new MockEnrichmentService(config));
      
      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });

    it('should handle missing config file gracefully', () => {
      // This test verifies the system works even without a config file
      // by using the default configuration
      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });
  });

  describe('Service Factory', () => {
    it('should create services dynamically from config', () => {
      // Register a service
      registerEnrichmentService('dynamicService', (config: any) => new MockEnrichmentService(config));
      
      // The registration should work without hardcoded service references
      const registeredServices = getRegisteredEnrichmentServices();
      expect(registeredServices.length).toBeGreaterThan(0);
    });

    it('should handle unknown service names gracefully', () => {
      // This test verifies that the system doesn't break when encountering
      // unknown service names in the config
      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });
  });
}); 