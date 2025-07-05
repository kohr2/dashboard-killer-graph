import { compactOntology } from '../compact-ontology';

describe('compactOntology', () => {
  const mockOntology = {
    entities: [
      {
        name: 'Supplier',
        description: 'A company that provides goods or services',
        properties: ['name', 'address', 'contact']
      },
      {
        name: 'Contract',
        description: 'A legally binding agreement',
        properties: ['id', 'value', 'startDate', 'endDate']
      },
      {
        name: 'Award',
        description: 'A contract award decision',
        properties: ['id', 'date', 'amount']
      },
      {
        name: 'Thing',
        description: 'Generic entity type',
        properties: ['id']
      }
    ],
    relationships: [
      {
        source: 'Supplier',
        target: 'Contract',
        type: 'awarded_to',
        description: 'Supplier is awarded a contract'
      },
      {
        source: 'Contract',
        target: 'Award',
        type: 'has_award',
        description: 'Contract has an associated award'
      },
      {
        source: 'Entity',
        target: 'Entity',
        type: 'hasProperty',
        description: 'Generic property relationship'
      }
    ]
  };

  it('should compact ontology by removing generic entities and relationships', () => {
    const result = compactOntology(mockOntology);

    expect(result).toEqual({
      e: ['Supplier', 'Contract', 'Award'],
      r: [
        ['Supplier', 'awarded_to', 'Contract'],
        ['Contract', 'has_award', 'Award']
      ]
    });
  });

  it('should filter out generic entities like Thing and Entity', () => {
    const result = compactOntology(mockOntology);

    expect(result.e).not.toContain('Thing');
    expect(result.e).not.toContain('Entity');
    expect(result.e).toContain('Supplier');
    expect(result.e).toContain('Contract');
    expect(result.e).toContain('Award');
  });

  it('should filter out generic relationships like Entity->Entity', () => {
    const result = compactOntology(mockOntology);

    const relationshipStrings = result.r.map(r => `${r[0]}->${r[2]}`);
    expect(relationshipStrings).not.toContain('Entity->Entity');
    expect(relationshipStrings).toContain('Supplier->Contract');
    expect(relationshipStrings).toContain('Contract->Award');
  });

  it('should use short keys (e for entities, r for relationships)', () => {
    const result = compactOntology(mockOntology);

    expect(result).toHaveProperty('e');
    expect(result).toHaveProperty('r');
    expect(Array.isArray(result.e)).toBe(true);
    expect(Array.isArray(result.r)).toBe(true);
  });

  it('should format relationships as arrays of [source, type, target]', () => {
    const result = compactOntology(mockOntology);

    expect(result.r[0]).toEqual(['Supplier', 'awarded_to', 'Contract']);
    expect(result.r[1]).toEqual(['Contract', 'has_award', 'Award']);
  });

  it('should handle empty ontology gracefully', () => {
    const emptyOntology = {
      entities: [],
      relationships: []
    };

    const result = compactOntology(emptyOntology);

    expect(result).toEqual({
      e: [],
      r: []
    });
  });

  it('should handle ontology with only generic entities and relationships', () => {
    const genericOntology = {
      entities: [
        { name: 'Thing', description: 'Generic entity', properties: [] },
        { name: 'Entity', description: 'Another generic entity', properties: [] }
      ],
      relationships: [
        { source: 'Entity', target: 'Entity', type: 'hasProperty', description: 'Generic' }
      ]
    };

    const result = compactOntology(genericOntology);

    expect(result).toEqual({
      e: [],
      r: []
    });
  });
}); 