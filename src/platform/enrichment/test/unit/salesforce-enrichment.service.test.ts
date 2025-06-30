import 'reflect-metadata';
import { SalesforceEnrichmentService } from '../../salesforce-enrichment.service';
import { Organization } from '@crm/domain/entities/organization';
import { IEnrichmentService, EnrichableEntity } from '@platform/enrichment';

describe('SalesforceEnrichmentService', () => {
  let service: IEnrichmentService;

  beforeEach(() => {
    // For now, we instantiate it directly. Later, it might have dependencies.
    service = new SalesforceEnrichmentService();
  });

  it('should have the correct name', () => {
    expect(service.name).toBe('Salesforce');
  });

  it('should not enrich an entity without an external identifier', async () => {
    const entity: Organization = {
      id: 'org-1',
      name: 'No ID Corp',
      label: 'Organization',
      legalName: 'No ID Corp Inc.',
    };
    const result = await service.enrich(entity);
    expect(result).toBeNull();
  });

  it('should enrich an entity that has a CIK in its metadata', async () => {
    const entity: Organization = {
      id: 'org-2',
      name: 'Has CIK Corp',
      label: 'Organization',
      legalName: 'Has CIK Corp LLC',
      metadata: {
        cik: '12345',
      },
    };

    const result = await service.enrich(entity);

    expect(result).not.toBeNull();
    expect(result?.metadata?.salesforceId).toBe('SFDC-MOCK-12345');
    expect(result?.metadata?.accountStatus).toBe('Active');
    // Ensure existing metadata is preserved
    expect(result?.metadata?.cik).toBe('12345');
  });

  it('should return null if the API call (simulated) fails', async () => {
    // In a real scenario, we would mock the Salesforce client (e.g., jsforce)
    // For now, we can add a special case in the service logic for testing failures.
    const entity: Organization = {
      id: 'org-fail',
      name: 'Fail Corp',
      label: 'Organization',
      legalName: 'Failure Corporation',
      metadata: {
        cik: 'FAIL-TRIGGER', // Special CIK to trigger a simulated failure
      },
    };

    const result = await service.enrich(entity);
    expect(result).toBeNull();
  });
}); 