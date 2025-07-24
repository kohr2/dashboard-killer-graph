import { OntologyService } from '@platform/ontology/ontology.service';

/**
 * RED test – enrichment resolution should climb up inheritance chain.
 */
describe('OntologyService.getEnrichmentServiceName (inheritance aware)', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
  });

  it('returns parent enrichment service when subtype lacks one', () => {
    const testOntology = {
      name: 'TestOnt',
      entities: {
        Organization: {
          enrichment: { service: 'edgar' },
        },
        Company: {
          parent: 'Organization',
        },
      },
    };

    ontologyService.loadFromObjects([testOntology as any]);

    const companyEntity = { id: '1', type: 'Company', label: 'Company', name: 'ACME Corp' } as any;

    expect(ontologyService.getEnrichmentServiceName(companyEntity)).toBe('edgar');
  });
}); 