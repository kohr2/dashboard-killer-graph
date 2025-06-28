import 'reflect-metadata';
import {
  EnrichmentOrchestratorService,
  IEnrichmentService,
  EnrichableEntity,
} from '@platform/enrichment'; // Correct path using alias
import { Organization } from '@crm/domain/entities/organization';

// Mock Implementation of IEnrichmentService for testing
class MockEdgarService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  async enrich(entity: EnrichableEntity): Promise<Partial<Organization> | null> {
    if (entity.name === 'TestCorp') {
      return {
        metadata: {
          ...('metadata' in entity && entity.metadata), // Preserve existing metadata
          cik: '12345',
          sic: '6789',
        },
      };
    }
    return null;
  }
}

class MockSalesforceService implements IEnrichmentService {
  public readonly name = 'Salesforce';
  async enrich(entity: EnrichableEntity): Promise<Partial<Organization> | null> {
    if ('metadata' in entity && (entity.metadata as any)?.cik) {
      return {
        metadata: {
          ...entity.metadata,
          salesforceId: 'SFDC-98765',
          accountOwner: 'John Doe',
        },
      };
    }
    return null;
  }
}

describe('EnrichmentOrchestratorService', () => {
  let orchestrator: EnrichmentOrchestratorService;
  let edgarService: MockEdgarService;
  let salesforceService: MockSalesforceService;

  beforeEach(() => {
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

    const initialEntity: Organization = {
        id: 'org-1',
        name: 'TestCorp',
        label: 'Organization',
        legalName: 'Test Corporation Inc.',
    };

    const enrichedEntity = await orchestrator.enrich(initialEntity);

    expect(enrichedEntity).not.toBeNull();
    // Check EDGAR enrichment
    expect(enrichedEntity?.metadata?.cik).toBe('12345');
    // Check Salesforce enrichment, which depends on EDGAR's output
    expect(enrichedEntity?.metadata?.salesforceId).toBe('SFDC-98765');
    expect(enrichedEntity?.metadata?.accountOwner).toBe('John Doe');
  });

  it('should return the original entity if no service can enrich it', async () => {
    orchestrator.register(edgarService);

    const initialEntity: Organization = {
        id: 'org-2',
        name: 'UnknownCorp',
        label: 'Organization',
        legalName: 'Unknown Corp LLC',
    };

    const result = await orchestrator.enrich(initialEntity);
    // Should return the entity with no changes
    expect(result).toEqual(initialEntity);
  });

  it('should merge metadata without overwriting existing fields', async () => {
    orchestrator.register(edgarService);

    const initialEntity: Organization = {
        id: 'org-1',
        name: 'TestCorp',
        label: 'Organization',
        legalName: 'Test Corporation Inc.',
        metadata: {
            source: 'initial-source'
        }
    };

    const enrichedEntity = await orchestrator.enrich(initialEntity);

    expect(enrichedEntity?.metadata?.source).toBe('initial-source');
    expect(enrichedEntity?.metadata?.cik).toBe('12345');
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

    const initialEntity: Organization = {
        id: 'org-1',
        name: 'TestCorp',
        label: 'Organization',
        legalName: 'Test Corporation Inc.',
    };

    const enrichedEntity = await orchestrator.enrich(initialEntity);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error during enrichment with service 'FailingService':")
    );
    // The second service should still have enriched the entity
    expect(enrichedEntity.metadata?.cik).toBe('12345');

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });
}); 