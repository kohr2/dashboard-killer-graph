import 'reflect-metadata';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Failing test for the upcoming `registerSelectedOntologies` helper.
 */

describe('registerSelectedOntologies', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('restricts loaded entity types to the specified ontology (procurement)', () => {
    const { registerAllOntologies } = require('../register-ontologies');
    const { OntologyService } = require('@platform/ontology/ontology.service');

    registerAllOntologies();
    const allCount = OntologyService.getInstance().getAllEntityTypes().length;

    jest.resetModules();

    const { registerSelectedOntologies } = require('../register-ontologies');
    const { OntologyService: OntologyService2 } = require('@platform/ontology/ontology.service');

    // Test will fail until function is implemented
    expect(typeof registerSelectedOntologies).toBe('function');

    registerSelectedOntologies(['procurement']);
    const selectedCount = OntologyService2.getInstance().getAllEntityTypes().length;

    expect(selectedCount).toBeLessThan(allCount);
  });
}); 