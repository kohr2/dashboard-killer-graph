import 'reflect-metadata';
import { SalesforceEnrichmentService } from '../../salesforce-enrichment.service';
import { OrganizationDTO, createOrganizationDTO } from '@generated/crm';
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
    const entity = createOrganizationDTO({
      id: 'org-1',
      name: 'No ID Corp',
      type: 'Organization',
      label: 'Organization',
      legalName: 'No ID Corp Inc.',
    });
    const result = await service.enrich(entity);
    expect(result).toBeNull();
  });

  it('should enrich an entity that has a CIK in its metadata', async () => {
    const entity = createOrganizationDTO({
      id: 'org-2',
      name: 'Has CIK Corp',
      type: 'Organization',
      label: 'Organization',
      legalName: 'Has CIK Corp LLC',
    });
    // Add metadata as a property on the entity
    (entity as any).metadata = {
      cik: '12345',
    };

    const result = await service.enrich(entity);

    expect(result).not.toBeNull();
    expect((result as any)?.metadata?.salesforceId).toBe('SFDC-MOCK-12345');
    expect((result as any)?.metadata?.accountStatus).toBe('Active');
    // Ensure existing metadata is preserved
    expect((result as any)?.metadata?.cik).toBe('12345');
  });

  it('should return null if the API call (simulated) fails', async () => {
    // In a real scenario, we would mock the Salesforce client (e.g., jsforce)
    // For now, we can add a special case in the service logic for testing failures.
    const entity = createOrganizationDTO({
      id: 'org-fail',
      name: 'Fail Corp',
      type: 'Organization',
      label: 'Organization',
      legalName: 'Failure Corporation',
    });
    // Add metadata as a property on the entity
    (entity as any).metadata = {
      cik: 'FAIL-TRIGGER', // Special CIK to trigger a simulated failure
    };

    const result = await service.enrich(entity);
    expect(result).toBeNull();
  });
}); 