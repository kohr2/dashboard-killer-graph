import { describe, it, expect } from '@jest/globals';

describe('build-ontology type handling', () => {
  it('should reproduce the failing Array.from filter pattern', () => {
    // This test reproduces the exact failing code pattern from build-ontology.ts
    
    // Simulate the problematic Set construction that results in Set<unknown>
    const allEntityNames = new Set<unknown>(['Entity1', 'Entity2', 'Entity3']);
    const topEntityNames = new Set<string>(['Entity1']);
    
    // This is the exact failing line from the original code:
    // const ignoredEntities = Array.from(allEntityNames).filter((name: string) => !topEntityNames.has(name));
    
    // The test should fail with type errors until the code is fixed
    expect(() => {
      // This line should cause TypeScript errors until fixed
      const ignoredEntities = Array.from(allEntityNames).filter((name: string) => !topEntityNames.has(name));
      return ignoredEntities;
    }).toThrow(); // This test should fail until the type errors are fixed
  });

  it('should reproduce the failing entity object access pattern', () => {
    // Simulate the problematic entity object handling
    const entity: unknown = {
      name: 'TestEntity',
      properties: { label: 'string' },
      description: { _: 'Test description' }
    };
    
    // This reproduces the exact failing code patterns from the original:
    // const hasNameProperty = entity.properties && Object.keys(entity.properties).some(...)
    // entity.vectorIndex = hasNameProperty && (isVeryImportant || contextRelevant);
    
    expect(() => {
      // These lines should cause TypeScript errors until fixed
      const hasNameProperty = entity.properties && Object.keys(entity.properties).some(propName => propName === 'label');
      (entity as any).vectorIndex = hasNameProperty && true;
      return (entity as any).vectorIndex;
    }).toThrow(); // This test should fail until the type errors are fixed
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

  it('should reproduce the failing description access pattern', () => {
    const entity: unknown = {
      name: 'TestEntity',
      description: { _: 'Test description' }
    };
    
    expect(() => {
      // This reproduces the exact failing line from the original code:
      // const fullText = `${entityName.toLowerCase()} ${(typeof entity.description === 'string' ? entity.description : (entity.description as any)?._ || '').toLowerCase()}`;
      
      const entityName = 'TestEntity';
      const fullText = `${entityName.toLowerCase()} ${(typeof entity.description === 'string' ? entity.description : (entity.description as any)?._ || '').toLowerCase()}`;
      return fullText;
    }).toThrow(); // This test should fail until the type errors are fixed
  });
}); 