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
}); 