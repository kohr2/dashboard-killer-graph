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
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
  });

  describe('basic functionality', () => {
    it('returns a formatted string containing entity and relationship names', () => {
      // Arrange: create service and load a minimal ontology
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
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act: get the schema representation
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: the returned string should contain our entity and relationship names
      expect(schemaStr).toEqual(expect.stringContaining('Person'));
      expect(schemaStr).toEqual(expect.stringContaining('Organization'));
      expect(schemaStr).toEqual(expect.stringContaining('WORKS_FOR'));
      expect(schemaStr).toEqual(expect.stringContaining('Employment relationship'));
    });

    it('returns correct entity and relationship counts in headers', () => {
      // Arrange: load ontology with specific counts
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: { description: 'A person entity' },
          Organization: { description: 'An organization entity' },
          Deal: { description: 'A business deal' },
        },
        relationships: {
          WORKS_FOR: {
            domain: 'Person',
            range: 'Organization',
            description: 'Employment relationship',
          },
          INVOLVES: {
            domain: 'Deal',
            range: 'Organization',
            description: 'Deal involves organization',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: headers should show correct counts
      expect(schemaStr).toEqual(expect.stringContaining('## Entities (3)'));
      expect(schemaStr).toEqual(expect.stringContaining('## Relationships (2)'));
    });
  });

  describe('entity formatting', () => {
    it('formats entities with descriptions correctly', () => {
      // Arrange
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: { description: 'A human being' },
          Organization: { description: 'A business entity' },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: entities should be formatted with descriptions
      expect(schemaStr).toEqual(expect.stringContaining('- Person: A human being'));
      expect(schemaStr).toEqual(expect.stringContaining('- Organization: A business entity'));
    });

    it('formats entities without descriptions correctly', () => {
      // Arrange
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: {},
          Organization: {},
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: entities should be formatted without descriptions
      expect(schemaStr).toEqual(expect.stringContaining('- Person'));
      expect(schemaStr).toEqual(expect.stringContaining('- Organization'));
      expect(schemaStr).not.toEqual(expect.stringContaining('- Person:'));
      expect(schemaStr).not.toEqual(expect.stringContaining('- Organization:'));
    });
  });

  describe('relationship formatting', () => {
    it('formats relationships with descriptions correctly', () => {
      // Arrange
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: {},
          Organization: {},
        },
        relationships: {
          WORKS_FOR: {
            domain: 'Person',
            range: 'Organization',
            description: 'Employment relationship',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: relationships should be formatted with descriptions
      expect(schemaStr).toEqual(expect.stringContaining('- WORKS_FOR (Person → Organization): Employment relationship'));
    });

    it('formats relationships without descriptions correctly', () => {
      // Arrange
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: {},
          Organization: {},
        },
        relationships: {
          WORKS_FOR: {
            domain: 'Person',
            range: 'Organization',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: relationships should be formatted without descriptions
      expect(schemaStr).toEqual(expect.stringContaining('- WORKS_FOR (Person → Organization)'));
      expect(schemaStr).not.toEqual(expect.stringContaining('- WORKS_FOR (Person → Organization):'));
    });

    it('handles array domains and ranges correctly', () => {
      // Arrange
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: {},
          Organization: {},
          Deal: {},
        },
        relationships: {
          INVOLVES: {
            domain: ['Person', 'Organization'],
            range: ['Deal', 'Organization'],
            description: 'Involvement relationship',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: arrays should be joined with ' | '
      expect(schemaStr).toEqual(expect.stringContaining('- INVOLVES (Person | Organization → Deal | Organization): Involvement relationship'));
    });

    it('handles mixed string and array domains/ranges', () => {
      // Arrange
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: {},
          Organization: {},
          Deal: {},
        },
        relationships: {
          INVOLVES: {
            domain: 'Person',
            range: ['Deal', 'Organization'],
            description: 'Mixed relationship',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should handle mixed types correctly
      expect(schemaStr).toEqual(expect.stringContaining('- INVOLVES (Person → Deal | Organization): Mixed relationship'));
    });
  });

  describe('edge cases', () => {
    it('handles empty ontology correctly', () => {
      // Arrange: load empty ontology
      const testOntology = {
        name: 'EmptyOntology',
        entities: {},
        relationships: {},
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should show empty state
      expect(schemaStr).toEqual(expect.stringContaining('## Entities (0)'));
      expect(schemaStr).toEqual(expect.stringContaining('## Relationships (0)'));
      expect(schemaStr).toEqual(expect.stringContaining('- _None loaded_'));
    });

    it('handles ontology with only entities', () => {
      // Arrange: ontology with entities but no relationships
      const testOntology = {
        name: 'EntityOnlyOntology',
        entities: {
          Person: { description: 'A person' },
          Organization: { description: 'An organization' },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should show entities but no relationships
      expect(schemaStr).toEqual(expect.stringContaining('## Entities (2)'));
      expect(schemaStr).toEqual(expect.stringContaining('## Relationships (0)'));
      expect(schemaStr).toEqual(expect.stringContaining('- Person: A person'));
      expect(schemaStr).toEqual(expect.stringContaining('- Organization: An organization'));
      expect(schemaStr).toEqual(expect.stringContaining('- _None loaded_'));
    });

    it('handles ontology with only relationships', () => {
      // Arrange: ontology with relationships but no entities (edge case)
      const testOntology = {
        name: 'RelationshipOnlyOntology',
        entities: {},
        relationships: {
          WORKS_FOR: {
            domain: 'Person',
            range: 'Organization',
            description: 'Employment relationship',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should show relationships but no entities
      expect(schemaStr).toEqual(expect.stringContaining('## Entities (0)'));
      expect(schemaStr).toEqual(expect.stringContaining('## Relationships (1)'));
      expect(schemaStr).toEqual(expect.stringContaining('- _None loaded_'));
      expect(schemaStr).toEqual(expect.stringContaining('- WORKS_FOR (Person → Organization): Employment relationship'));
    });

    it('handles multiple ontologies correctly', () => {
      // Arrange: load multiple ontologies
      const ontology1 = {
        name: 'Ontology1',
        entities: {
          Person: { description: 'A person' },
        },
        relationships: {
          WORKS_FOR: {
            domain: 'Person',
            range: 'Organization',
            description: 'Employment',
          },
        },
      };

      const ontology2 = {
        name: 'Ontology2',
        entities: {
          Deal: { description: 'A business deal' },
        },
        relationships: {
          INVOLVES: {
            domain: 'Deal',
            range: 'Organization',
            description: 'Involvement',
          },
        },
      };

      ontologyService.loadFromObjects([ontology1, ontology2]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should aggregate all entities and relationships
      expect(schemaStr).toEqual(expect.stringContaining('## Entities (2)'));
      expect(schemaStr).toEqual(expect.stringContaining('## Relationships (2)'));
      expect(schemaStr).toEqual(expect.stringContaining('- Person: A person'));
      expect(schemaStr).toEqual(expect.stringContaining('- Deal: A business deal'));
      expect(schemaStr).toEqual(expect.stringContaining('- WORKS_FOR (Person → Organization): Employment'));
      expect(schemaStr).toEqual(expect.stringContaining('- INVOLVES (Deal → Organization): Involvement'));
    });

    it('handles entities with special characters in names', () => {
      // Arrange: entities with special characters
      const testOntology = {
        name: 'SpecialCharsOntology',
        entities: {
          'Person-Contact': { description: 'A person contact' },
          'Organization_Entity': { description: 'An organization entity' },
          'Deal$Type': { description: 'A deal type' },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should handle special characters correctly
      expect(schemaStr).toEqual(expect.stringContaining('- Person-Contact: A person contact'));
      expect(schemaStr).toEqual(expect.stringContaining('- Organization_Entity: An organization entity'));
      expect(schemaStr).toEqual(expect.stringContaining('- Deal$Type: A deal type'));
    });

    it('handles relationships with special characters in names', () => {
      // Arrange: relationships with special characters
      const testOntology = {
        name: 'SpecialCharsOntology',
        entities: {
          Person: {},
          Organization: {},
        },
        relationships: {
          'WORKS_FOR_ORGANIZATION': {
            domain: 'Person',
            range: 'Organization',
            description: 'Employment relationship',
          },
          'HAS-ROLE': {
            domain: 'Person',
            range: 'Organization',
            description: 'Role relationship',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should handle special characters correctly
      expect(schemaStr).toEqual(expect.stringContaining('- WORKS_FOR_ORGANIZATION (Person → Organization): Employment relationship'));
      expect(schemaStr).toEqual(expect.stringContaining('- HAS-ROLE (Person → Organization): Role relationship'));
    });
  });

  describe('output format validation', () => {
    it('returns a properly formatted markdown-style string', () => {
      // Arrange
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
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act
      const schemaStr = ontologyService.getSchemaRepresentation();

      // Assert: should have proper markdown structure
      const lines = schemaStr.split('\n');
      
      // Should start with entities section
      expect(lines[0]).toBe('## Entities (2)');
      expect(lines[1]).toBe('- Person: A person entity');
      expect(lines[2]).toBe('- Organization: An organization entity');
      
      // Should have empty line before relationships
      expect(lines[3]).toBe('');
      
      // Should have relationships section
      expect(lines[4]).toBe('## Relationships (1)');
      expect(lines[5]).toBe('- WORKS_FOR (Person → Organization): Employment relationship');
    });

    it('maintains consistent formatting across multiple calls', () => {
      // Arrange
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Person: { description: 'A person entity' },
        },
        relationships: {
          WORKS_FOR: {
            domain: 'Person',
            range: 'Organization',
            description: 'Employment relationship',
          },
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      // Act: call multiple times
      const schemaStr1 = ontologyService.getSchemaRepresentation();
      const schemaStr2 = ontologyService.getSchemaRepresentation();

      // Assert: should be identical
      expect(schemaStr1).toBe(schemaStr2);
    });
  });
});

describe('OntologyService.getKeyProperties', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
  });

  it('returns key properties for an entity type', () => {
    // Arrange: create service and load ontology with key properties
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
    };

    ontologyService.loadFromObjects([testOntology]);

    // Act & Assert: get key properties for existing entities
    expect(ontologyService.getKeyProperties('Person')).toEqual(['name', 'email', 'phone']);
    expect(ontologyService.getKeyProperties('Organization')).toEqual(['name', 'industry']);
  });

  it('returns empty array for entity type without key properties', () => {
    // Arrange: create service and load ontology without key properties
    const testOntology = {
      name: 'TestOntology',
      entities: {
        Person: { description: 'A person entity' }, // No keyProperties defined
      },
    };

    ontologyService.loadFromObjects([testOntology]);

    // Act & Assert: should return empty array
    expect(ontologyService.getKeyProperties('Person')).toEqual([]);
  });

  it('returns empty array for non-existent entity type', () => {
    // Arrange: create service and load ontology
    const testOntology = {
      name: 'TestOntology',
      entities: {
        Person: { description: 'A person entity' },
      },
    };

    ontologyService.loadFromObjects([testOntology]);

    // Act & Assert: should return empty array for non-existent entity
    expect(ontologyService.getKeyProperties('NonExistentEntity')).toEqual([]);
  });
});

describe('OntologyService.getEnrichmentServiceName', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
  });

  describe('basic functionality', () => {
    it('returns enrichment service name for entity with configured service', () => {
      // Arrange: create service and load ontology with enrichment configuration
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          },
          Person: {
            description: 'A person entity',
            enrichment: {
              service: 'edgar-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const organizationEntity = {
        id: 'org-1',
        type: 'Organization',
        label: 'Organization',
        name: 'Test Corp'
      };

      const personEntity = {
        id: 'person-1',
        type: 'Person',
        label: 'Person',
        name: 'John Doe'
      };

      // Act & Assert: should return correct enrichment service names
      expect(ontologyService.getEnrichmentServiceName(organizationEntity)).toBe('salesforce-enrichment');
      expect(ontologyService.getEnrichmentServiceName(personEntity)).toBe('edgar-enrichment');
    });

    it('returns undefined for entity without enrichment configuration', () => {
      // Arrange: create service and load ontology without enrichment configuration
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity'
            // No enrichment configuration
          },
          Person: {
            description: 'A person entity'
            // No enrichment configuration
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const organizationEntity = {
        id: 'org-1',
        type: 'Organization',
        label: 'Organization',
        name: 'Test Corp'
      };

      const personEntity = {
        id: 'person-1',
        type: 'Person',
        label: 'Person',
        name: 'John Doe'
      };

      // Act & Assert: should return undefined for entities without enrichment
      expect(ontologyService.getEnrichmentServiceName(organizationEntity)).toBeUndefined();
      expect(ontologyService.getEnrichmentServiceName(personEntity)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('returns undefined for entity without label property', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entityWithoutLabel = {
        id: 'org-1',
        type: 'Organization',
        name: 'Test Corp'
        // Missing label property
      };

      // Act & Assert: should return undefined when label is missing
      expect(ontologyService.getEnrichmentServiceName(entityWithoutLabel)).toBeUndefined();
    });

    it('returns undefined for entity with null/undefined label', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entityWithNullLabel = {
        id: 'org-1',
        type: 'Organization',
        label: null,
        name: 'Test Corp'
      };

      const entityWithUndefinedLabel = {
        id: 'org-1',
        type: 'Organization',
        label: undefined,
        name: 'Test Corp'
      };

      // Act & Assert: should return undefined for null/undefined labels
      expect(ontologyService.getEnrichmentServiceName(entityWithNullLabel)).toBeUndefined();
      expect(ontologyService.getEnrichmentServiceName(entityWithUndefinedLabel)).toBeUndefined();
    });

    it('returns undefined for entity with empty string label', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entityWithEmptyLabel = {
        id: 'org-1',
        type: 'Organization',
        label: '',
        name: 'Test Corp'
      };

      // Act & Assert: should return undefined for empty string label
      expect(ontologyService.getEnrichmentServiceName(entityWithEmptyLabel)).toBeUndefined();
    });

    it('returns undefined for entity type not found in ontology', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entityWithUnknownType = {
        id: 'unknown-1',
        type: 'UnknownType',
        label: 'UnknownType',
        name: 'Unknown Entity'
      };

      // Act & Assert: should return undefined for unknown entity type
      expect(ontologyService.getEnrichmentServiceName(entityWithUnknownType)).toBeUndefined();
    });

    it('returns undefined for entity with label that does not match any entity type', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entityWithMismatchedLabel = {
        id: 'org-1',
        type: 'Organization',
        label: 'NonExistentType', // Label doesn't match any entity type
        name: 'Test Corp'
      };

      // Act & Assert: should return undefined for mismatched label
      expect(ontologyService.getEnrichmentServiceName(entityWithMismatchedLabel)).toBeUndefined();
    });

    it('handles entity with additional properties correctly', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entityWithExtraProperties = {
        id: 'org-1',
        type: 'Organization',
        label: 'Organization',
        name: 'Test Corp',
        industry: 'Technology',
        size: 'Large',
        foundedYear: '2020',
        // Additional properties that should be ignored
        customField: 'custom value',
        metadata: { key: 'value' }
      };

      // Act & Assert: should return enrichment service despite extra properties
      expect(ontologyService.getEnrichmentServiceName(entityWithExtraProperties)).toBe('salesforce-enrichment');
    });
  });

  describe('enrichment service configuration', () => {
    it('handles different enrichment service names', () => {
      // Arrange: create service and load ontology with various enrichment services
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          },
          Person: {
            description: 'A person entity',
            enrichment: {
              service: 'edgar-enrichment'
            }
          },
          Deal: {
            description: 'A deal entity',
            enrichment: {
              service: 'crunchbase-enrichment'
            }
          },
          Contact: {
            description: 'A contact entity',
            enrichment: {
              service: 'linkedin-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entities = [
        { id: 'org-1', type: 'Organization', label: 'Organization', name: 'Test Corp' },
        { id: 'person-1', type: 'Person', label: 'Person', name: 'John Doe' },
        { id: 'deal-1', type: 'Deal', label: 'Deal', name: 'Acquisition Deal' },
        { id: 'contact-1', type: 'Contact', label: 'Contact', name: 'Jane Smith' }
      ];

      // Act & Assert: should return correct service for each entity type
      expect(ontologyService.getEnrichmentServiceName(entities[0])).toBe('salesforce-enrichment');
      expect(ontologyService.getEnrichmentServiceName(entities[1])).toBe('edgar-enrichment');
      expect(ontologyService.getEnrichmentServiceName(entities[2])).toBe('crunchbase-enrichment');
      expect(ontologyService.getEnrichmentServiceName(entities[3])).toBe('linkedin-enrichment');
    });

    it('handles enrichment service with special characters', () => {
      // Arrange: create service and load ontology with special characters in service name
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment-v2.1'
            }
          },
          Person: {
            description: 'A person entity',
            enrichment: {
              service: 'edgar_enrichment_service'
            }
          },
          Deal: {
            description: 'A deal entity',
            enrichment: {
              service: 'crunchbase-enrichment.prod'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const entities = [
        { id: 'org-1', type: 'Organization', label: 'Organization', name: 'Test Corp' },
        { id: 'person-1', type: 'Person', label: 'Person', name: 'John Doe' },
        { id: 'deal-1', type: 'Deal', label: 'Deal', name: 'Acquisition Deal' }
      ];

      // Act & Assert: should handle special characters in service names
      expect(ontologyService.getEnrichmentServiceName(entities[0])).toBe('salesforce-enrichment-v2.1');
      expect(ontologyService.getEnrichmentServiceName(entities[1])).toBe('edgar_enrichment_service');
      expect(ontologyService.getEnrichmentServiceName(entities[2])).toBe('crunchbase-enrichment.prod');
    });
  });

  describe('multiple ontologies', () => {
    it('handles enrichment services from multiple ontologies', () => {
      // Arrange: create service and load multiple ontologies
      const ontology1 = {
        name: 'CRM',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      const ontology2 = {
        name: 'Financial',
        entities: {
          Deal: {
            description: 'A deal entity',
            enrichment: {
              service: 'crunchbase-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([ontology1, ontology2]);

      const entities = [
        { id: 'org-1', type: 'Organization', label: 'Organization', name: 'Test Corp' },
        { id: 'deal-1', type: 'Deal', label: 'Deal', name: 'Acquisition Deal' }
      ];

      // Act & Assert: should return correct services from different ontologies
      expect(ontologyService.getEnrichmentServiceName(entities[0])).toBe('salesforce-enrichment');
      expect(ontologyService.getEnrichmentServiceName(entities[1])).toBe('crunchbase-enrichment');
    });

    it('handles conflicting enrichment services (last loaded wins)', () => {
      // Arrange: create service and load ontologies with conflicting enrichment services
      const ontology1 = {
        name: 'CRM',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      const ontology2 = {
        name: 'Financial',
        entities: {
          Organization: {
            description: 'An organization entity (financial context)',
            enrichment: {
              service: 'crunchbase-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([ontology1, ontology2]);

      const entity = {
        id: 'org-1',
        type: 'Organization',
        label: 'Organization',
        name: 'Test Corp'
      };

      // Act & Assert: should return service from last loaded ontology
      expect(ontologyService.getEnrichmentServiceName(entity)).toBe('crunchbase-enrichment');
    });
  });

  describe('type safety and validation', () => {
    it('handles entity with minimal required properties', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const minimalEntity = {
        id: 'org-1',
        type: 'Organization',
        label: 'Organization'
        // Only required properties
      };

      // Act & Assert: should work with minimal entity
      expect(ontologyService.getEnrichmentServiceName(minimalEntity)).toBe('salesforce-enrichment');
    });

    it('handles entity with all optional properties', () => {
      // Arrange: create service and load ontology
      const testOntology = {
        name: 'TestOntology',
        entities: {
          Organization: {
            description: 'An organization entity',
            enrichment: {
              service: 'salesforce-enrichment'
            }
          }
        },
      };

      ontologyService.loadFromObjects([testOntology]);

      const fullEntity = {
        id: 'org-1',
        type: 'Organization',
        label: 'Organization',
        name: 'Test Corporation',
        legalName: 'Test Corporation Inc.',
        industry: 'Technology',
        website: 'https://test.com',
        description: 'A test organization',
        size: 'Large',
        foundedYear: '2020',
        headquarters: { city: 'San Francisco', country: 'USA' },
        address: { street: '123 Main St', city: 'San Francisco' },
        phone: '+1-555-0123',
        email: 'contact@test.com',
        parentOrganizationId: 'parent-1',
        activities: ['software', 'consulting'],
        knowledgeElements: ['AI', 'ML'],
        validationStatus: 'validated',
        preferences: { language: 'en', timezone: 'PST' },
        enrichedData: { revenue: 1000000, employees: 50 },
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2023-01-01')
      };

      // Act & Assert: should work with full entity
      expect(ontologyService.getEnrichmentServiceName(fullEntity)).toBe('salesforce-enrichment');
    });
  });
}); 