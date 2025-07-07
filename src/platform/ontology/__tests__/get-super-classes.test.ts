import { OntologyService } from '@platform/ontology/ontology.service';

/**
 * Unit tests for OntologyService.getSuperClasses – NEW FEATURE (RED phase)
 * ---------------------------------------------------------------
 * The new method should return the list of all parent classes (super-classes)
 * declared via the `parent` *or* `parentClass` property in the ontology.
 * The returned array must be ordered from immediate parent up to the topmost
 * ancestor. If no parent is declared the array should be empty.
 */

describe('OntologyService.getSuperClasses', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
  });

  it('returns an empty array when the entity has no parent', () => {
    const testOntology = {
      name: 'TestOnt',
      entities: {
        Thing: { description: 'Top entity' },
      },
    };

    ontologyService.loadFromObjects([testOntology as any]);

    expect(ontologyService.getSuperClasses('Thing')).toEqual([]);
  });

  it('returns the full inheritance chain when `parent` is used', () => {
    const testOntology = {
      name: 'TestOnt',
      entities: {
        Organization: {},
        FinancialInstitution: { parent: 'Organization' },
        Bank: { parent: 'FinancialInstitution' },
      },
    };

    ontologyService.loadFromObjects([testOntology as any]);

    expect(ontologyService.getSuperClasses('Bank')).toEqual([
      'FinancialInstitution',
      'Organization',
    ]);
  });

  it('is able to read the legacy `parentClass` property', () => {
    const testOntology = {
      name: 'TestOnt',
      entities: {
        Organization: {},
        Company: { parentClass: 'Organization' },
      },
    };

    ontologyService.loadFromObjects([testOntology as any]);

    expect(ontologyService.getSuperClasses('Company')).toEqual(['Organization']);
  });

  it('prevents infinite loops on circular inheritance definitions', () => {
    const testOntology = {
      name: 'TestOnt',
      entities: {
        Alpha: { parent: 'Beta' },
        Beta: { parent: 'Alpha' },
      },
    };

    ontologyService.loadFromObjects([testOntology as any]);

    // Should break the cycle and return each super class only once
    expect(ontologyService.getSuperClasses('Alpha')).toEqual(['Beta']);
  });
}); 