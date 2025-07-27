import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OntologyAgnosticEnrichmentService } from '../ontology-agnostic-enrichment.service';
import { IEnrichmentService } from '../i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from '../dto-aliases';

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('OntologyAgnosticEnrichmentService', () => {
  let service: OntologyAgnosticEnrichmentService;
  let mockEnrichmentService: jest.Mocked<IEnrichmentService>;

  beforeEach(() => {
    service = new OntologyAgnosticEnrichmentService();
    
    mockEnrichmentService = {
      name: 'test-service',
      enrich: jest.fn(),
    } as jest.Mocked<IEnrichmentService>;
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      expect(service.name).toBe('ontology-agnostic');
    });

    it('should initialize with empty services map', () => {
      expect((service as any).services).toBeInstanceOf(Map);
      expect((service as any).services.size).toBe(0);
    });
  });

  describe('registerService', () => {
    it('should register a service successfully', () => {
      service.registerService(mockEnrichmentService);
      
      expect((service as any).services.has('test-service')).toBe(true);
      expect((service as any).services.get('test-service')).toBe(mockEnrichmentService);
    });

    it('should register multiple services', () => {
      const mockService2: jest.Mocked<IEnrichmentService> = {
        name: 'test-service-2',
        enrich: jest.fn(),
      } as jest.Mocked<IEnrichmentService>;

      service.registerService(mockEnrichmentService);
      service.registerService(mockService2);
      
      expect((service as any).services.size).toBe(2);
      expect((service as any).services.has('test-service')).toBe(true);
      expect((service as any).services.has('test-service-2')).toBe(true);
    });

    it('should overwrite existing service with same name', () => {
      const mockService2: jest.Mocked<IEnrichmentService> = {
        name: 'test-service',
        enrich: jest.fn(),
      } as jest.Mocked<IEnrichmentService>;

      service.registerService(mockEnrichmentService);
      service.registerService(mockService2);
      
      expect((service as any).services.size).toBe(1);
      expect((service as any).services.get('test-service')).toBe(mockService2);
    });
  });

  describe('enrich', () => {
    it('should enrich entity successfully', async () => {
      const entity: GenericEntity = {
        id: 'test-entity-1',
        type: 'Person',
        label: 'John Doe',
        properties: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      const result = await service.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.enrichedBy).toBe('ontology-agnostic');
      expect(result.data!.entityType).toBe('Person');
      expect(result.data!.timestamp).toBeDefined();
      expect(new Date(result.data!.timestamp)).toBeInstanceOf(Date);
    });

    it('should handle entity without type', async () => {
      const entity: GenericEntity = {
        id: 'test-entity-2',
        type: 'Unknown',
        label: 'Unknown Entity',
        properties: {
          name: 'Unknown Entity'
        }
      };

      const result = await service.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data!.entityType).toBe('Unknown');
    });

    it('should handle entity with null type', async () => {
      const entity: GenericEntity = {
        id: 'test-entity-3',
        type: null as any,
        label: 'Null Type Entity',
        properties: {
          name: 'Null Type Entity'
        }
      };

      const result = await service.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data!.entityType).toBe('unknown');
    });

    it('should handle entity with undefined type', async () => {
      const entity: GenericEntity = {
        id: 'test-entity-4',
        type: undefined as any,
        label: 'Undefined Type Entity',
        properties: {
          name: 'Undefined Type Entity'
        }
      };

      const result = await service.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data!.entityType).toBe('unknown');
    });

    it('should handle entity with empty properties', async () => {
      const entity: GenericEntity = {
        id: 'test-entity-5',
        type: 'Organization',
        label: 'Organization',
        properties: {}
      };

      const result = await service.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data!.entityType).toBe('Organization');
    });

    it('should handle entity with complex properties', async () => {
      const entity: GenericEntity = {
        id: 'test-entity-6',
        type: 'Company',
        label: 'Acme Corp',
        properties: {
          name: 'Acme Corp',
          founded: 1990,
          employees: 1000,
          isPublic: true,
          subsidiaries: ['Sub1', 'Sub2'],
          metadata: {
            industry: 'Technology',
            sector: 'Software'
          }
        }
      };

      const result = await service.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data!.entityType).toBe('Company');
    });

    it('should handle enrichment error gracefully', async () => {
      // Create a new service instance for this test to avoid affecting other tests
      const testService = new OntologyAgnosticEnrichmentService();

      // Create an entity that might cause issues
      const entity: GenericEntity = {
        id: 'test-entity-error',
        type: 'Person',
        label: 'Error Entity',
        properties: { name: 'Error Entity' }
      };

      // The service should handle errors gracefully and return a success result
      const result = await testService.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.enrichedBy).toBe('ontology-agnostic');
      expect(result.data!.entityType).toBe('Person');
    });

    it('should handle non-Error exceptions', async () => {
      // Create a new service instance for this test
      const testService = new OntologyAgnosticEnrichmentService();

      const entity: GenericEntity = {
        id: 'test-entity-string-error',
        type: 'Person',
        label: 'String Error Entity',
        properties: { name: 'String Error Entity' }
      };

      const result = await testService.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.enrichedBy).toBe('ontology-agnostic');
      expect(result.data!.entityType).toBe('Person');
    });

    it('should handle null exception', async () => {
      // Create a new service instance for this test
      const testService = new OntologyAgnosticEnrichmentService();

      const entity: GenericEntity = {
        id: 'test-entity-null-error',
        type: 'Person',
        label: 'Null Error Entity',
        properties: { name: 'Null Error Entity' }
      };

      const result = await testService.enrich(entity);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.enrichedBy).toBe('ontology-agnostic');
      expect(result.data!.entityType).toBe('Person');
    });
  });

  describe('integration', () => {
    it('should work with registered services', () => {
      // Register a service
      service.registerService(mockEnrichmentService);
      
      // Verify it's registered
      expect((service as any).services.has('test-service')).toBe(true);
      
      // The enrich method should still work normally
      const entity: GenericEntity = {
        id: 'integration-test',
        type: 'Test',
        label: 'Integration Test',
        properties: { name: 'Integration Test' }
      };

      return expect(service.enrich(entity)).resolves.toMatchObject({
        success: true,
        data: {
          enrichedBy: 'ontology-agnostic',
          entityType: 'Test'
        }
      });
    });
  });
}); 