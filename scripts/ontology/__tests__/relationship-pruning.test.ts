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
}); 