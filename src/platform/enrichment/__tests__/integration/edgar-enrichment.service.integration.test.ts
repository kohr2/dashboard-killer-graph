import * as dotenv from 'dotenv';
import { join } from 'path';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '../../edgar-enrichment.service';
import { GenericEntity } from '../../dto-aliases';

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
    const morganStanley: GenericEntity = {
      id: 'org-ms',
      name: 'MORGAN STANLEY',
      type: 'Organization',
      label: 'Organization',
    };

    // Act: Enrich the entity
    const enrichedData = await service.enrich(morganStanley);

    // Assert: Check for the expected enriched data
    expect(enrichedData).not.toBeNull();
    expect(enrichedData).toBeDefined();

    if (enrichedData && enrichedData.success && enrichedData.data) {
      // eslint-disable-next-line no-console
      console.log('--- Enriched Properties ---');
      // eslint-disable-next-line no-console
      console.log('Legal Name:', enrichedData.data.legalName);
      // eslint-disable-next-line no-console
      console.log('CIK:', enrichedData.data.cik);
      // eslint-disable-next-line no-console
      console.log('SIC:', enrichedData.data.sic);
      // eslint-disable-next-line no-console
      console.log('SIC Description:', enrichedData.data.sicDescription);
      if (enrichedData.data.address) {
        // eslint-disable-next-line no-console
        console.log('Address:', `${enrichedData.data.address.street1}, ${enrichedData.data.address.city}, ${enrichedData.data.address.stateOrCountry} ${enrichedData.data.address.zipCode}`);
      }
      // eslint-disable-next-line no-console
      console.log('-------------------------');
    }
    
    // Assertions
    expect(enrichedData.success).toBe(true);
    expect(enrichedData.data).toBeDefined();
    expect(enrichedData.data?.cik).toBeDefined();
    expect(enrichedData.data?.legalName).toContain('MORGAN STANLEY');
    expect(enrichedData.data?.sic).toBeDefined();
    expect(enrichedData.data?.address).toBeDefined();

    // Note: Cache file creation is optional and depends on filesystem permissions
    // The service works correctly even without caching
  }, 30000); // Increase timeout to 30s for network request
}); 