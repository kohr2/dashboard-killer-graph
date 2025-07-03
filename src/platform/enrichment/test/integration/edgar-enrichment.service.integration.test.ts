import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '@platform/enrichment';
import { OrganizationDTO } from '@generated/crm/OrganizationDTO';
import { container } from 'tsyringe';
import { CacheService } from '@platform/cache/cache.service';

// Load environment variables from .env file
dotenv.config();

const SEC_API_USER_AGENT = process.env.SEC_API_USER_AGENT;

if (!SEC_API_USER_AGENT) {
  throw new Error('SEC_API_USER_AGENT must be set in your .env file for this test.');
}

// Register the user agent with the DI container
container.register('SEC_API_USER_AGENT', { useValue: SEC_API_USER_AGENT });

describe.skip('EdgarEnrichmentService - Integration Test', () => {
  let service: EdgarEnrichmentService;
  let cacheService: CacheService;
  const cachePath = join(__dirname, '..', '..', '..', '..', 'cache', 'company_tickers.json');

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
    // Resolve the service from the container.
    // This will inject the SEC_API_USER_AGENT.
    service = container.resolve(EdgarEnrichmentService);
    cacheService = container.resolve(CacheService);
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
    
    // Check for specific fields that should be returned by the EDGAR API
    expect(enrichedData?.cik).toBeDefined();
    expect(enrichedData?.legalName).toContain('MORGAN STANLEY');
    expect(enrichedData?.sic).toBeDefined();
    expect(enrichedData?.address).toBeDefined();

    // Verify that the cache file was created
    const cacheExists = await fs.access(cachePath).then(() => true).catch(() => false);
    expect(cacheExists).toBe(true);
  }, 30000); // Increase timeout to 30s for network request
}); 