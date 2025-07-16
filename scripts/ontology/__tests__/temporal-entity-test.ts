import { pruneRelationshipsByEntities } from '../relationship-utils';

interface TestRelationship {
  name: string;
  source: string;
  target: string;
}

describe('TemporalEntity relationship pruning', () => {
  it('should keep TemporalEntity relationships when TemporalEntity is present', () => {
    const relationships: TestRelationship[] = [
      { name: 'after', source: 'TemporalEntity', target: 'TemporalEntity' },
      { name: 'before', source: 'TemporalEntity', target: 'TemporalEntity' },
      { name: 'hasConcept', source: 'ConceptScheme', target: 'Concept' },
      { name: 'hasAgent', source: 'LegalResource', target: 'Agent' }
    ];

    // Include TemporalEntity in allowed entities
    const allowedEntities = new Set(['TemporalEntity', 'ConceptScheme']);

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    // Should keep TemporalEntity relationships
    expect(kept.map(r => r.name)).toContain('after');
    expect(kept.map(r => r.name)).toContain('before');
    
    // Should prune relationships referencing missing entities
    expect(prunedNames).toContain('hasConcept'); // Concept not in allowed entities
    expect(prunedNames).toContain('hasAgent');   // LegalResource and Agent not in allowed entities
    
    expect(kept.length).toBe(2);
    expect(prunedNames.length).toBe(2);
  });

  it('should prune TemporalEntity relationships when TemporalEntity is NOT present', () => {
    const relationships: TestRelationship[] = [
      { name: 'after', source: 'TemporalEntity', target: 'TemporalEntity' },
      { name: 'before', source: 'TemporalEntity', target: 'TemporalEntity' },
      { name: 'hasConcept', source: 'ConceptScheme', target: 'Concept' }
    ];

    // TemporalEntity NOT in allowed entities
    const allowedEntities = new Set(['ConceptScheme', 'Concept']);

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    // Should prune TemporalEntity relationships
    expect(prunedNames).toContain('after');
    expect(prunedNames).toContain('before');
    
    // Should keep relationships where both entities are present
    expect(kept.map(r => r.name)).toContain('hasConcept');
    
    expect(kept.length).toBe(1);
    expect(prunedNames.length).toBe(2);
  });

  it('should demonstrate the procurement ontology issue', () => {
    // Simulate the procurement ontology scenario
    const relationships: TestRelationship[] = [
      { name: 'after', source: 'TemporalEntity', target: 'TemporalEntity' },
      { name: 'hasTopConcept', source: 'ConceptScheme', target: 'Concept' },
      { name: 'semanticRelation', source: 'Concept', target: 'Concept' },
      { name: 'countersigned_by', source: 'LegalResource', target: 'Agent' }
    ];

    // Simulate entities available without external imports (procurement entities only)
    const allowedEntities = new Set([
      'Contract', 'Tender', 'Business', 'Document', 'Procedure', 'Lot', 'AwardOutcome'
      // Note: TemporalEntity, ConceptScheme, Concept, LegalResource, Agent are NOT included
    ]);

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    // All relationships should be pruned because their source/target entities are not available
    expect(kept.length).toBe(0);
    expect(prunedNames.length).toBe(4);
    expect(prunedNames).toContain('after');
    expect(prunedNames).toContain('hasTopConcept');
    expect(prunedNames).toContain('semanticRelation');
    expect(prunedNames).toContain('countersigned_by');
  });
}); 