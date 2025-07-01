import { OntologyService } from '@platform/ontology/ontology.service';

/**
 * Unit test for the (currently missing) `getSchemaRepresentation` method.
 *
 * According to system requirements the method should return a human-readable
 * string that lists all loaded entity and relationship types so that other
 * services (e.g. the MCP server) can expose the graph schema to LLMs.
 *
 * The test intentionally fails until the method is implemented (TDD – RED).
 */

describe('OntologyService.getSchemaRepresentation', () => {
  it('returns a formatted string containing entity and relationship names', () => {
    // Arrange: create service and load a minimal ontology
    const ontologyService = new OntologyService();
    const testOntology = {
      name: 'TestOntology',
      entities: {
        Person: { description: 'A person entity' },
        Organization: { description: 'An organization entity' },
      },
      relationships: {
        WORKS_FOR: {
          domain: 'Person',
          range: 'Organization',
          description: 'Employment relationship',
        },
      },
    } as any;

    ontologyService.loadFromObjects([testOntology]);

    // Act: attempt to get the schema representation
    // This call should eventually succeed once the method exists.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – the method does not exist yet, which is expected at RED phase
    const schemaStr = ontologyService.getSchemaRepresentation();

    // Assert: the returned string should contain our entity and relationship names
    expect(schemaStr).toEqual(expect.stringContaining('Person'));
    expect(schemaStr).toEqual(expect.stringContaining('Organization'));
    expect(schemaStr).toEqual(expect.stringContaining('WORKS_FOR'));
  });
});

describe('OntologyService.getKeyProperties', () => {
  it('returns key properties for an entity type', () => {
    // Arrange: create service and load ontology with key properties
    const ontologyService = new OntologyService();
    const testOntology = {
      name: 'TestOntology',
      entities: {
        Person: { 
          description: 'A person entity',
          keyProperties: ['name', 'email', 'phone']
        },
        Organization: { 
          description: 'An organization entity',
          keyProperties: ['name', 'industry']
        },
      },
    } as any;

    ontologyService.loadFromObjects([testOntology]);

    // Act & Assert: get key properties for existing entities
    expect(ontologyService.getKeyProperties('Person')).toEqual(['name', 'email', 'phone']);
    expect(ontologyService.getKeyProperties('Organization')).toEqual(['name', 'industry']);
  });

  it('returns empty array for entity type without key properties', () => {
    // Arrange: create service and load ontology without key properties
    const ontologyService = new OntologyService();
    const testOntology = {
      name: 'TestOntology',
      entities: {
        Person: { description: 'A person entity' }, // No keyProperties defined
      },
    } as any;

    ontologyService.loadFromObjects([testOntology]);

    // Act & Assert: should return empty array
    expect(ontologyService.getKeyProperties('Person')).toEqual([]);
  });

  it('returns empty array for non-existent entity type', () => {
    // Arrange: create service and load ontology
    const ontologyService = new OntologyService();
    const testOntology = {
      name: 'TestOntology',
      entities: {
        Person: { description: 'A person entity' },
      },
    } as any;

    ontologyService.loadFromObjects([testOntology]);

    // Act & Assert: should return empty array for non-existent entity
    expect(ontologyService.getKeyProperties('NonExistentEntity')).toEqual([]);
  });
}); 