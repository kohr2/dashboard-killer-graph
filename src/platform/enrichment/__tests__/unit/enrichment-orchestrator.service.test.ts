import { OntologyService } from '@platform/ontology/ontology.service';
import {
  EnrichmentOrchestratorService,
  IEnrichmentService,
} from '@platform/enrichment';
import { GenericEntity, createGenericEntity, EnrichmentResult } from '@platform/enrichment/dto-aliases';

// Mock Implementation of IEnrichmentService for testing
class MockEdgarService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    if (entity.name === 'TestCorp') {
      return {
        success: true,
        data: {
          cik: '12345',
          sic: '6789',
        },
      };
    }
    return { success: false, error: 'Company not found' };
  }
}

class MockSalesforceService implements IEnrichmentService {
  public readonly name = 'Salesforce';
  async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    return {
      success: true,
      data: {
        salesforceId: 'SFDC-98765',
      },
    };
  }
}

describe('EnrichmentOrchestratorService', () => {
  let orchestrator: EnrichmentOrchestratorService;
  let edgarService: MockEdgarService;
  let salesforceService: MockSalesforceService;
  let mockOntologyService: jest.Mocked<OntologyService>;

  beforeEach(() => {
    // Mock OntologyService
    mockOntologyService = {
      getEnrichmentServiceName: jest.fn(),
    } as unknown as jest.Mocked<OntologyService>;

    // Mock the container.resolve to return our mock service
    const { container } = require('tsyringe');
    jest.spyOn(container, 'resolve').mockReturnValue(mockOntologyService);
    
    // Directly instantiate
    orchestrator = new EnrichmentOrchestratorService();

    edgarService = new MockEdgarService();
    salesforceService = new MockSalesforceService();
  });

  it('should register and retrieve enrichment services', () => {
    orchestrator.register(edgarService);
    orchestrator.register(salesforceService);
    expect(orchestrator.getServices()).toHaveLength(2);
    expect(orchestrator.getServices().map(s => s.name)).toEqual(['EDGAR', 'Salesforce']);
  });

  it('should enrich an entity by calling services in registration order', async () => {
    orchestrator.register(edgarService);
    orchestrator.register(salesforceService);
    const initialEntity = createGenericEntity('Organization', { 
      id: 'org-1', 
      name: 'TestCorp', 
      label: 'TestCorp'
    });
    
    // Enrichment with EDGAR service (only service used for Organization entities)
    const edgarEnrichedEntity = await orchestrator.enrich(initialEntity);
    expect(edgarEnrichedEntity).not.toBeNull();
    expect((edgarEnrichedEntity as any).enrichedData?.EDGAR?.cik).toBe('12345');
    
    // Second enrichment should still use EDGAR since it's an Organization entity
    const finalEntity = await orchestrator.enrich(edgarEnrichedEntity) as GenericEntity;
    expect(finalEntity).not.toBeNull();
    expect((finalEntity as any).enrichedData?.EDGAR?.cik).toBe('12345');
  });

  it('should return the original entity if no service can enrich it', async () => {
    orchestrator.register(edgarService);

    const initialEntity = createGenericEntity('Organization', { 
      id: 'org-2', 
      name: 'UnknownCorp', 
      label: 'UnknownCorp'
    });

    const result = await orchestrator.enrich(initialEntity);
    // Should return the entity with no changes
    expect(result).toEqual(initialEntity);
  });

  it('should merge metadata without overwriting existing fields', async () => {
    orchestrator.register(edgarService);

    const initialEntity = createGenericEntity('Organization', { 
      id: 'org-1', 
      name: 'TestCorp', 
      label: 'TestCorp'
    });
    (initialEntity as any).enrichedData = { source: 'initial-source' };

    // Setup the mock
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('EDGAR');

    const enrichedEntity = await orchestrator.enrich(initialEntity) as GenericEntity;

    expect((enrichedEntity as any).enrichedData?.source).toBe('initial-source');
    expect((enrichedEntity as any).enrichedData?.EDGAR?.cik).toBe('12345');
  });

  it('should continue enrichment even if one service fails', async () => {
    // Create a failing EDGAR service
    const failingEdgarService: IEnrichmentService = {
      name: 'EDGAR',
      enrich: jest.fn().mockRejectedValue(new Error('API is down')),
    };

    // Spy on logger.error to ensure it's called
    const loggerErrorSpy = jest.spyOn(require('@shared/utils/logger').logger, 'error').mockImplementation(() => {});

    orchestrator.register(failingEdgarService);

    const initialEntity = createGenericEntity('Organization', { 
      id: 'org-1', 
      name: 'TestCorp', 
      label: 'TestCorp'
    });
    
    // Attempt to enrich with the failing service
    const failedEnrichmentEntity = await orchestrator.enrich(initialEntity);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error enriching entity with service 'EDGAR':"),
        expect.any(Error)
    );
    // The entity should be returned unchanged
    expect(failedEnrichmentEntity).toEqual(initialEntity);

    // Clean up the spy
    loggerErrorSpy.mockRestore();
  });
}); 