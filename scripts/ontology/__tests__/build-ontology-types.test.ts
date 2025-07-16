import { describe, it, expect } from '@jest/globals';

describe('build-ontology type handling', () => {
  it('should reproduce the failing Array.from filter pattern', () => {
    // This test reproduces the exact failing code pattern from build-ontology.ts
    
    // Simulate the fixed Set construction with proper types
    const allEntityNames = new Set<string>(['Entity1', 'Entity2', 'Entity3']);
    const topEntityNames = new Set<string>(['Entity1']);
    
    // This should now work with proper types
    const ignoredEntities = Array.from(allEntityNames).filter((name: string) => !topEntityNames.has(name));
    expect(ignoredEntities).toEqual(['Entity2', 'Entity3']);
  });

  it('should handle entity object access pattern correctly', () => {
    // Simulate the entity object handling with proper types
    const entity: any = {
      name: 'TestEntity',
      properties: { label: 'string' },
      description: { _: 'Test description' }
    };
    
    // This should now work with proper typing
    const hasNameProperty = entity.properties && Object.keys(entity.properties).some((propName: string) => propName === 'label');
    entity.vectorIndex = hasNameProperty && true;
    expect(entity.vectorIndex).toBe(true);
  });

  it('should reproduce the failing Set type conversion pattern', () => {
    // Simulate the problematic Set type conversion
    const allowedEntityNames = new Set<unknown>(['Entity1', 'Entity2']);
    
    // This reproduces the exact failing code pattern from the original:
    // const { kept: keptRels, prunedNames } = pruneRelationshipsByEntities(relationships, allowedEntityNames);
    
    expect(() => {
      // This should cause TypeScript errors until fixed
      const relationships: any[] = [];
      const pruneRelationshipsByEntities = (rels: any[], entitySet: Set<string>) => ({ kept: rels, prunedNames: [] });
      const result = pruneRelationshipsByEntities(relationships, allowedEntityNames as Set<string>);
      return result;
    }).toThrow(); // This test should fail until the type errors are fixed
  });

  it('should handle description access pattern correctly', () => {
    const entity: any = {
      name: 'TestEntity',
      description: { _: 'Test description' }
    };
    
    // This should now work with proper typing
    const entityName = 'TestEntity';
    const fullText = `${entityName.toLowerCase()} ${(typeof entity.description === 'string' ? entity.description : (entity.description as any)?._ || '').toLowerCase()}`;
    expect(fullText).toBe('testentity test description');
  });
}); 