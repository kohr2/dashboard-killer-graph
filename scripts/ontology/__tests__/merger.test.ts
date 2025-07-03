import { OntologyMerger } from '../merger';
import { Entity, Relationship } from '../ontology-source';
import { OverrideConfig } from '../config';

describe('OntologyMerger', () => {
  it('should merge entity overrides', async () => {
    const sourceEntities: Record<string, Entity> = {
      LegalEntity: {
        name: 'LegalEntity',
        description: 'A legal entity from source',
        properties: {
          name: { type: 'string', description: 'Entity name' },
          id: { type: 'string', description: 'Entity ID' }
        },
        keyProperties: ['name'],
        vectorIndex: true
      }
    };

    const overrides: OverrideConfig = {
      entities: {
        LegalEntity: {
          description: 'A legal entity with custom description',
          properties: {
            customField: { type: 'string', description: 'Custom field for local use' }
          },
          keyProperties: ['name', 'customField']
        }
      },
      relationships: {}
    };

    const merger = new OntologyMerger();
    const merged = await merger.merge({ entities: sourceEntities, relationships: {} }, overrides);

    expect(merged.entities.LegalEntity.description).toBe('A legal entity with custom description');
    expect(merged.entities.LegalEntity.properties).toHaveProperty('name');
    expect(merged.entities.LegalEntity.properties).toHaveProperty('id');
    expect(merged.entities.LegalEntity.properties).toHaveProperty('customField');
    expect(merged.entities.LegalEntity.keyProperties).toEqual(['name', 'customField']);
  });

  it('should add new entities from overrides', async () => {
    const sourceEntities: Record<string, Entity> = {
      LegalEntity: {
        name: 'LegalEntity',
        description: 'A legal entity',
        properties: {},
        keyProperties: ['name'],
        vectorIndex: true
      }
    };

    const overrides: OverrideConfig = {
      entities: {
        CustomEntity: {
          name: 'CustomEntity',
          description: 'A custom entity',
          properties: {
            customProp: { type: 'string', description: 'Custom property' }
          },
          keyProperties: ['customProp'],
          vectorIndex: false
        }
      },
      relationships: {}
    };

    const merger = new OntologyMerger();
    const merged = await merger.merge({ entities: sourceEntities, relationships: {} }, overrides);

    expect(merged.entities).toHaveProperty('LegalEntity');
    expect(merged.entities).toHaveProperty('CustomEntity');
    expect(merged.entities.CustomEntity.description).toBe('A custom entity');
    expect(merged.entities.CustomEntity.vectorIndex).toBe(false);
  });

  it('should merge relationship overrides', async () => {
    const sourceRelationships: Record<string, Relationship> = {
      hasAddress: {
        name: 'hasAddress',
        description: 'Has an address from source',
        source: 'LegalEntity',
        target: 'Address'
      }
    };

    const overrides: OverrideConfig = {
      entities: {},
      relationships: {
        hasAddress: {
          description: 'Has an address with custom description',
          source: 'LegalEntity',
          target: 'CustomAddress'
        },
        customRelation: {
          name: 'customRelation',
          description: 'A custom relationship',
          source: 'LegalEntity',
          target: 'CustomEntity'
        }
      }
    };

    const merger = new OntologyMerger();
    const merged = await merger.merge({ entities: {}, relationships: sourceRelationships }, overrides);

    expect(merged.relationships.hasAddress.description).toBe('Has an address with custom description');
    expect(merged.relationships.hasAddress.target).toBe('CustomAddress');
    expect(merged.relationships).toHaveProperty('customRelation');
    expect(merged.relationships.customRelation.description).toBe('A custom relationship');
  });

  it('should handle deep property merging', async () => {
    const sourceEntities: Record<string, Entity> = {
      LegalEntity: {
        name: 'LegalEntity',
        description: 'A legal entity',
        properties: {
          name: { type: 'string', description: 'Entity name' },
          metadata: {
            created: { type: 'date', description: 'Creation date' },
            updated: { type: 'date', description: 'Last update' }
          }
        },
        keyProperties: ['name'],
        vectorIndex: true
      }
    };

    const overrides: OverrideConfig = {
      entities: {
        LegalEntity: {
          properties: {
            metadata: {
              created: { type: 'date', description: 'Creation date (custom)' },
              version: { type: 'string', description: 'Version number' }
            },
            status: { type: 'string', description: 'Entity status' }
          }
        }
      },
      relationships: {}
    };

    const merger = new OntologyMerger();
    const merged = await merger.merge({ entities: sourceEntities, relationships: {} }, overrides);

    expect(merged.entities.LegalEntity.properties.name).toEqual({ type: 'string', description: 'Entity name' });
    expect(merged.entities.LegalEntity.properties.metadata.created.description).toBe('Creation date (custom)');
    expect(merged.entities.LegalEntity.properties.metadata.updated).toEqual({ type: 'date', description: 'Last update' });
    expect(merged.entities.LegalEntity.properties.metadata.version).toEqual({ type: 'string', description: 'Version number' });
    expect(merged.entities.LegalEntity.properties.status).toEqual({ type: 'string', description: 'Entity status' });
  });

  it('should preserve source data when no overrides are provided', async () => {
    const sourceEntities: Record<string, Entity> = {
      LegalEntity: {
        name: 'LegalEntity',
        description: 'A legal entity',
        properties: { name: { type: 'string' } },
        keyProperties: ['name'],
        vectorIndex: true
      }
    };

    const sourceRelationships: Record<string, Relationship> = {
      hasAddress: {
        name: 'hasAddress',
        description: 'Has an address',
        source: 'LegalEntity',
        target: 'Address'
      }
    };

    const overrides: OverrideConfig = {
      entities: {},
      relationships: {}
    };

    const merger = new OntologyMerger();
    const merged = await merger.merge({ entities: sourceEntities, relationships: sourceRelationships }, overrides);

    expect(merged.entities.LegalEntity).toEqual(sourceEntities.LegalEntity);
    expect(merged.relationships.hasAddress).toEqual(sourceRelationships.hasAddress);
  });
}); 