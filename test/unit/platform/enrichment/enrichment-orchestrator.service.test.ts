import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import {
  EnrichmentOrchestratorService,
  IEnrichmentService,
  EnrichableEntity,
} from '@platform/enrichment'; // Correct path using alias
import { Organization } from '@crm/domain/entities/organization';

// Mock Implementation of IEnrichmentService for testing
class MockEdgarService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  async enrich(entity: EnrichableEntity): Promise<Record<string, any>> {
    if (entity.name === 'TestCorp') {
      return {
        enrichedData: {
          EDGAR: {
            metadata: {
              cik: '12345',
              sic: '6789',
            },
          },
        }
      };
    }
    return {};
  }
}

class MockSalesforceService implements IEnrichmentService {
  public readonly name = 'Salesforce';
  async enrich(entity: EnrichableEntity): Promise<Record<string, any> | null> {
    if ('metadata' in entity && (entity.metadata as any)?.cik) {
      return {
        enrichedData: {
          Salesforce: {
            metadata: {
              salesforceId: 'SFDC-98765',
              accountOwner: 'John Doe',
            },
          },
        }
      };
    }
    return null;
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

    // Register the mock in the container
    container.register(OntologyService, { useValue: mockOntologyService });
    
    // The orchestrator will now get the mock when it's resolved
    orchestrator = container.resolve(EnrichmentOrchestratorService);

    edgarService = new MockEdgarService();
    salesforceService = new MockSalesforceService();
  });

  afterEach(() => {
    container.clearInstances();
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

    const initialEntity: Organization = new Organization(
      'org-1',
      'TestCorp',
    );

    // 1. Enrich with EDGAR
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('EDGAR');
    const edgarEnrichedEntity = await orchestrator.enrich(initialEntity);

    // 2. Enrich the result with Salesforce
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('Salesforce');
    const finalEntity = await orchestrator.enrich(edgarEnrichedEntity) as Organization;
    
    expect(finalEntity).not.toBeNull();
    // Check EDGAR enrichment data is still present
    // With the corrected mocks and orchestrator logic, the data should be merged
    expect(finalEntity.enrichedData?.EDGAR?.metadata?.cik).toBe('12345');
    // Check Salesforce enrichment
    expect(finalEntity.enrichedData?.Salesforce?.metadata?.salesforceId).toBe('SFDC-98765');
  });

  it('should return the original entity if no service can enrich it', async () => {
    orchestrator.register(edgarService);

    const initialEntity: Organization = new Organization(
        'org-2',
        'UnknownCorp',
    );

    const result = await orchestrator.enrich(initialEntity);
    // Should return the entity with no changes
    expect(result).toEqual(initialEntity);
  });

  it('should merge metadata without overwriting existing fields', async () => {
    orchestrator.register(edgarService);

    const initialEntity: Organization = new Organization(
        'org-1',
        'TestCorp',
    );
    initialEntity.enrichedData = { source: 'initial-source' };

    // Setup the mock
    mockOntologyService.getEnrichmentServiceName.mockReturnValue('EDGAR');

    const enrichedEntity = await orchestrator.enrich(initialEntity) as Organization;

    expect(enrichedEntity?.enrichedData?.source).toBe('initial-source');
    expect(enrichedEntity?.enrichedData?.EDGAR?.metadata?.cik).toBe('12345');
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

    const initialEntity: Organization = new Organization(
        'org-1',
        'TestCorp',
    );
    
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
    const successfulEnrichmentEntity = await orchestrator.enrich(failedEnrichmentEntity) as Organization;

    // The second service should have enriched the entity
    expect(successfulEnrichmentEntity.enrichedData?.EDGAR?.metadata?.cik).toBe('12345');

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });
}); 