import { OntologyService } from '@platform/ontology/ontology.service';
import {
  EnrichmentOrchestratorService,
  IEnrichmentService,
} from '@platform/enrichment';
import { OrganizationDTO, createOrganizationDTO } from '@generated/crm';

// Mock Implementation of IEnrichmentService for testing
class MockEdgarService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  async enrich(entity: OrganizationDTO): Promise<Record<string, any>> {
    if (entity.name === 'TestCorp') {
      return {
        ...entity,
        enrichedData: {
          ...(entity.enrichedData || {}),
          EDGAR: {
            metadata: {
              cik: '12345',
              sic: '6789',
            },
          },
        },
      };
    }
    return {};
  }
}

class MockSalesforceService implements IEnrichmentService {
  public readonly name = 'Salesforce';
  async enrich(entity: OrganizationDTO): Promise<Record<string, any>> {
    return {
      ...entity,
      enrichedData: {
        ...(entity.enrichedData || {}),
        Salesforce: {
          metadata: {
            salesforceId: 'SFDC-98765',
          },
        },
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

    // Directly instantiate without DI container
    orchestrator = new EnrichmentOrchestratorService(mockOntologyService);

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
    const initialEntity = createOrganizationDTO({ 
      id: 'org-1', 
      name: 'TestCorp', 
      type: 'Organization',
      label: 'TestCorp'
    });
    
    // First enrichment with EDGAR service
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('EDGAR');
    const edgarEnrichedEntity = await orchestrator.enrich(initialEntity);
    expect(edgarEnrichedEntity).not.toBeNull();
    expect((edgarEnrichedEntity as any).enrichedData?.EDGAR?.metadata?.cik).toBe('12345');
    
    // Second enrichment with Salesforce service on the already enriched entity
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('Salesforce');
    const finalEntity = await orchestrator.enrich(edgarEnrichedEntity) as OrganizationDTO;
    expect(finalEntity).not.toBeNull();
    expect((finalEntity as any).enrichedData?.EDGAR?.metadata?.cik).toBe('12345');
    expect((finalEntity as any).enrichedData?.Salesforce?.metadata?.salesforceId).toBe('SFDC-98765');
  });

  it('should return the original entity if no service can enrich it', async () => {
    orchestrator.register(edgarService);

    const initialEntity = createOrganizationDTO({ 
      id: 'org-2', 
      name: 'UnknownCorp', 
      type: 'Organization',
      label: 'UnknownCorp'
    });

    const result = await orchestrator.enrich(initialEntity);
    // Should return the entity with no changes
    expect(result).toEqual(initialEntity);
  });

  it('should merge metadata without overwriting existing fields', async () => {
    orchestrator.register(edgarService);

    const initialEntity = createOrganizationDTO({ 
      id: 'org-1', 
      name: 'TestCorp', 
      type: 'Organization',
      label: 'TestCorp'
    });
    (initialEntity as any).enrichedData = { source: 'initial-source' };

    // Setup the mock
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('EDGAR');

    const enrichedEntity = await orchestrator.enrich(initialEntity) as OrganizationDTO;

    expect((enrichedEntity as any).enrichedData?.source).toBe('initial-source');
    expect((enrichedEntity as any).enrichedData?.EDGAR?.metadata?.cik).toBe('12345');
  });

  it('should continue enrichment even if one service fails', async () => {
    const failingService: IEnrichmentService = {
      name: 'FailingService',
      enrich: jest.fn().mockRejectedValue(new Error('API is down')),
    };

    // Spy on console.error to ensure it's called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    orchestrator.register(failingService);
    orchestrator.register(edgarService); // This one should still run

    const initialEntity = createOrganizationDTO({ 
      id: 'org-1', 
      name: 'TestCorp', 
      type: 'Organization',
      label: 'TestCorp'
    });
    
    // 1. Attempt to enrich with the failing service
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('FailingService');
    const failedEnrichmentEntity = await orchestrator.enrich(initialEntity);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error during enrichment with service 'FailingService':")
    );
    // The entity should be returned unchanged
    expect(failedEnrichmentEntity).toEqual(initialEntity);

    // 2. Now, enrich the unchanged entity with the working service
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('EDGAR');
    const successfulEnrichmentEntity = await orchestrator.enrich(failedEnrichmentEntity) as OrganizationDTO;

    // The second service should have enriched the entity
    expect((successfulEnrichmentEntity as any).enrichedData?.EDGAR?.metadata?.cik).toBe('12345');

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });
}); 