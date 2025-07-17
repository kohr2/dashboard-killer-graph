import * as dotenv from 'dotenv';
import { join } from 'path';
import { promises as fs } from 'fs';
import { EdgarEnrichmentService } from '../../edgar-enrichment.service';

dotenv.config();

const SEC_API_USER_AGENT = process.env.SEC_API_USER_AGENT;

if (!SEC_API_USER_AGENT) {
  // eslint-disable-next-line no-console
  console.warn('SEC_API_USER_AGENT must be set in your .env file for this test. Skipping test.');
  // eslint-disable-next-line no-undef
  describe.skip('Procurement Business EDGAR Enrichment', () => { it('skipped', () => {}); });
} else {
  describe('Procurement Ontology - EDGAR Enrichment for Business Entity', () => {
    let service: EdgarEnrichmentService;
    const cachePath = join(__dirname, '..', '..', '..', '..', 'cache', 'edgar-cik-lookup.json');

    beforeAll(async () => {
      try {
        await fs.unlink(cachePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    });

    beforeEach(() => {
      // Use a more browser-like User-Agent if the env var is not set properly
      const userAgent = SEC_API_USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Dashboard Killer Graph Bot; benoitbonte84@gmail.com)';
      service = new EdgarEnrichmentService(userAgent);
    });

    it('should enrich a procurement Business entity with EDGAR data', async () => {
      const businessEntity = {
        id: 'business-ms',
        name: 'MORGAN STANLEY',
        type: 'Business',
        label: 'Business',
      };

      const enriched = await service.enrich(businessEntity);

      expect(enriched).not.toBeNull();
      expect(enriched).toBeDefined();
      expect(enriched).not.toEqual({});
      expect((enriched as any)?.cik).toBeDefined();
      expect((enriched as any)?.legalName).toContain('MORGAN STANLEY');
      expect((enriched as any)?.address).toBeDefined();
    }, 30000);
  });
} 