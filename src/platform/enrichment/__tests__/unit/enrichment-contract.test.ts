import 'reflect-metadata';
import { IEnrichmentService } from '@platform/enrichment/i-enrichment-service.interface';
import { EdgarEnrichmentService } from '@platform/enrichment/edgar-enrichment.service';
import { SalesforceEnrichmentService } from '@platform/enrichment/salesforce-enrichment.service';

// Generic compile-time assertion helper
// If a service type does not extend the interface, TypeScript will error.
type AssertService<T extends IEnrichmentService> = T;

// Compile-time checks (will fail to compile if the constraint is violated)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AssertEdgar = AssertService<EdgarEnrichmentService>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AssertSalesforce = AssertService<SalesforceEnrichmentService>;

// Runtime no-op test so Jest picks up the file
it('compiles enrichment services against the interface contract', () => {
  expect(true).toBe(true);
}); 