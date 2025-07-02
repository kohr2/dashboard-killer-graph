import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '../../edgar-enrichment.service';
import { Organization } from '@crm/domain/entities/organization';
import { container } from 'tsyringe';

// Load environment variables from .env file
dotenv.config();

const SEC_API_USER_AGENT = process.env.SEC_API_USER_AGENT;

if (!SEC_API_USER_AGENT) {
  throw new Error('SEC_API_USER_AGENT must be set in your .env file for this test.');
}

// Register the user agent with the DI container
container.register('SEC_API_USER_AGENT', { useValue: SEC_API_USER_AGENT });

describe('EdgarEnrichmentService - Integration Test', () => {
  let service: EdgarEnrichmentService;
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
  });

  it('should successfully enrich "MORGAN STANLEY" by fetching live data from the SEC', async () => {
    // Arrange: Create the entity to be enriched
    const morganStanley = new Organization('org-ms', 'MORGAN STANLEY');

    // Act: Enrich the entity
    const enrichedData = await service.enrich(morganStanley);

    // Assert: Check for the expected enriched data
    expect(enrichedData).not.toBeNull();
    expect(enrichedData).toBeDefined();

    if (enrichedData) {
      console.log('--- Enriched Properties ---');
      console.log('Legal Name:', enrichedData.legalName);
      console.log('CIK:', enrichedData.cik);
      console.log('SIC:', enrichedData.sic);
      console.log('SIC Description:', enrichedData.sicDescription);
      if (enrichedData.address) {
        console.log('Address:', `${enrichedData.address.street1}, ${enrichedData.address.city}, ${enrichedData.address.stateOrCountry} ${enrichedData.address.zipCode}`);
      }
      console.log('-------------------------');
    }
    
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