import 'reflect-metadata';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { registerAllOntologies, registerSelectedOntologies } from '../register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';

/**
 * Failing test for the upcoming `registerSelectedOntologies` helper.
 */

describe('registerSelectedOntologies', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('restricts loaded entity types to the specified ontology (procurement)', () => {
    registerAllOntologies();
    const allCount = OntologyService.getInstance().getAllEntityTypes().length;

    jest.resetModules();

    // Test will fail until function is implemented
    expect(typeof registerSelectedOntologies).toBe('function');

    registerSelectedOntologies(['procurement']);
    const selectedCount = OntologyService.getInstance().getAllEntityTypes().length;

    expect(selectedCount).toBeLessThan(allCount);
  });
}); 