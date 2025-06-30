import { OntologyService } from '@platform/ontology/ontology.service';

describe('OntologyService – plugin loading', () => {
  it('aggregates entity schemas from registered plugins', () => {
    const crmPlugin = {
      name: 'crm',
      entitySchemas: { Person: { description: 'A human being' } },
    } as any;

    const financialPlugin = {
      name: 'financial',
      entitySchemas: { Deal: { description: 'An investment deal' } },
    } as any;

    const ontologyService = new OntologyService();

    (ontologyService as any).loadFromPlugins([crmPlugin, financialPlugin]);

    const allTypes = ontologyService.getAllEntityTypes();
    expect(allTypes).toEqual(expect.arrayContaining(['Person', 'Deal']));
  });
}); 