import { pruneRelationshipsByEntities } from '../relationship-utils';

interface TestRelationship {
  name: string;
  source: string;
  target: string;
}

describe('pruneRelationshipsByEntities', () => {
  it('removes relationships referencing entities that are not in the allowed entity list', () => {
    const relationships: TestRelationship[] = [
      { name: 'relAB', source: 'A', target: 'B' },
      { name: 'relAC', source: 'A', target: 'C' },
      { name: 'relEntity', source: 'Entity', target: 'Entity' }
    ];

    const allowedEntities = new Set(['A', 'B']);

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    expect(kept.map(r => r.name)).toEqual(['relAB']);
    expect(prunedNames).toEqual(['relAC', 'relEntity']);
  });

  it('should raise an alert when all relationships are pruned', () => {
    const relationships: TestRelationship[] = [
      { name: 'relAB', source: 'A', target: 'B' },
      { name: 'relCD', source: 'C', target: 'D' },
      { name: 'relEF', source: 'E', target: 'F' }
    ];

    const allowedEntities = new Set(['X', 'Y', 'Z']); // No entities match the relationships

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    // This should be considered a critical error
    expect(kept).toHaveLength(0);
    expect(prunedNames).toHaveLength(3);
    
    // Log a warning for debugging
    console.warn('CRITICAL: All relationships were pruned! This indicates a serious problem with entity extraction or relationship processing.');
    console.warn(`Pruned relationships: ${prunedNames.join(', ')}`);
    console.warn(`Available entities: ${Array.from(allowedEntities).join(', ')}`);
  });

  it('should raise an alert when more than 90% of relationships are pruned', () => {
    const relationships: TestRelationship[] = [
      { name: 'relAB', source: 'A', target: 'B' },
      { name: 'relCD', source: 'C', target: 'D' },
      { name: 'relEF', source: 'E', target: 'F' },
      { name: 'relGH', source: 'G', target: 'H' },
      { name: 'relIJ', source: 'I', target: 'J' },
      { name: 'relKL', source: 'K', target: 'L' },
      { name: 'relMN', source: 'M', target: 'N' },
      { name: 'relOP', source: 'O', target: 'P' },
      { name: 'relQR', source: 'Q', target: 'R' },
      { name: 'relST', source: 'S', target: 'T' }
    ];

    const allowedEntities = new Set(['A', 'B', 'X', 'Y', 'Z']); // Only 1 relationship can be kept

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    const prunePercentage = (prunedNames.length / relationships.length) * 100;
    
    // This should trigger a warning
    if (prunePercentage > 90) {
      console.warn(`WARNING: ${prunePercentage.toFixed(1)}% of relationships were pruned! This may indicate a problem.`);
      console.warn(`Kept: ${kept.length}, Pruned: ${prunedNames.length}`);
    }

    expect(kept).toHaveLength(1);
    expect(prunedNames).toHaveLength(9);
    expect(prunePercentage).toBe(90);
  });

  it('should handle empty relationships array gracefully', () => {
    const relationships: TestRelationship[] = [];
    const allowedEntities = new Set(['A', 'B', 'C']);

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    expect(kept).toHaveLength(0);
    expect(prunedNames).toHaveLength(0);
  });

  it('should handle empty allowed entities set gracefully', () => {
    const relationships: TestRelationship[] = [
      { name: 'relAB', source: 'A', target: 'B' },
      { name: 'relCD', source: 'C', target: 'D' }
    ];

    const allowedEntities = new Set<string>();

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    expect(kept).toHaveLength(0);
    expect(prunedNames).toHaveLength(2);
  });

  it('should handle relationships and entities with capitalized underscore names', () => {
    // Entities and relationships use capitalized underscore names
    const relationships: TestRelationship[] = [
      { name: 'AFTER', source: 'TEMPORAL_ENTITY', target: 'TEMPORAL_ENTITY' },
      { name: 'BEFORE', source: 'TEMPORAL_ENTITY', target: 'TEMPORAL_ENTITY' },
      { name: 'RELATED_TO', source: 'CONCEPT', target: 'CONCEPT' },
      { name: 'HAS_AGENT', source: 'LEGAL_RESOURCE', target: 'AGENT' }
    ];

    // Only TEMPORAL_ENTITY is present
    const allowedEntities = new Set(['TEMPORAL_ENTITY']);

    const { kept, prunedNames } = pruneRelationshipsByEntities(relationships as any, allowedEntities);

    // Should keep only TEMPORAL_ENTITY relationships
    expect(kept.map(r => r.name)).toContain('AFTER');
    expect(kept.map(r => r.name)).toContain('BEFORE');
    expect(prunedNames).toContain('RELATED_TO');
    expect(prunedNames).toContain('HAS_AGENT');

    expect(kept.length).toBe(2);
    expect(prunedNames.length).toBe(2);
  });

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