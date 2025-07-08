import * as dotenv from 'dotenv';
import { join } from 'path';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '../../edgar-enrichment.service';
import { OrganizationDTO } from '@generated/crm/Organization.dto';

// Load environment variables from .env file
dotenv.config();

const SEC_API_USER_AGENT = process.env.SEC_API_USER_AGENT;

if (!SEC_API_USER_AGENT) {
  throw new Error('SEC_API_USER_AGENT must be set in your .env file for this test.');
}

describe('EdgarEnrichmentService - Integration Test', () => {
  let service: EdgarEnrichmentService;
  const cachePath = join(__dirname, '..', '..', '..', '..', 'cache', 'edgar-cik-lookup.json');

  beforeAll(async () => {
    // Ensure the cache is cleared before the integration test
    try {
      await fs.unlink(cachePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // If the error is not "file not found", re-throw it.
        throw error;
      }
      // If the file doesn't exist, that's fine, we can continue.
    }
  });
  
  beforeEach(() => {
    service = new EdgarEnrichmentService(SEC_API_USER_AGENT);
  });

  it('should successfully enrich "MORGAN STANLEY" by fetching live data from the SEC', async () => {
    // Arrange: Create the entity to be enriched
    const morganStanley: OrganizationDTO = {
      id: 'org-ms',
      name: 'MORGAN STANLEY',
      type: 'Organization',
      label: 'Organization',
      enrichedData: '',
    };

    // Act: Enrich the entity
    const enrichedData = await service.enrich(morganStanley);

    // Assert: Check for the expected enriched data
    expect(enrichedData).not.toBeNull();
    expect(enrichedData).toBeDefined();

    if (enrichedData) {
      // eslint-disable-next-line no-console
      console.log('--- Enriched Properties ---');
      // eslint-disable-next-line no-console
      console.log('Legal Name:', (enrichedData as any).legalName);
      // eslint-disable-next-line no-console
      console.log('CIK:', (enrichedData as any).cik);
      // eslint-disable-next-line no-console
      console.log('SIC:', (enrichedData as any).sic);
      // eslint-disable-next-line no-console
      console.log('SIC Description:', (enrichedData as any).sicDescription);
      if ((enrichedData as any).address) {
        // eslint-disable-next-line no-console
        console.log('Address:', `${(enrichedData as any).address.street1}, ${(enrichedData as any).address.city}, ${(enrichedData as any).address.stateOrCountry} ${(enrichedData as any).address.zipCode}`);
      }
      // eslint-disable-next-line no-console
      console.log('-------------------------');
    }
    
    // Assertions
    expect(enrichedData).not.toEqual({});
    expect((enrichedData as any)?.cik).toBeDefined();
    expect((enrichedData as any)?.legalName).toContain('MORGAN STANLEY');
    expect((enrichedData as any)?.sic).toBeDefined();
    expect((enrichedData as any)?.address).toBeDefined();

    // Note: Cache file creation is optional and depends on filesystem permissions
    // The service works correctly even without caching
  }, 30000); // Increase timeout to 30s for network request
}); 