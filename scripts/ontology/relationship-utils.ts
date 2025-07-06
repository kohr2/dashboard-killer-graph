export interface OntologyRelationship {
  name: string;
  description?: string;
  source: string;
  target: string;
}

export interface PruneResult<T> {
  kept: T[];
  prunedNames: string[];
}

/**
 * Remove relationships whose source or target types are not present in the allowedEntities set.
 * Returns kept relationships and pruned relationship names (for ignoredRelationships).
 */
export function pruneRelationshipsByEntities<T extends OntologyRelationship>(
  relationships: T[],
  allowedEntities: Set<string>
): PruneResult<T> {
  const kept: T[] = [];
  const prunedNames: string[] = [];

  for (const rel of relationships) {
    const sourceOk = allowedEntities.has(rel.source);
    const targetOk = allowedEntities.has(rel.target);

    if (sourceOk && targetOk) {
      kept.push(rel);
    } else {
      prunedNames.push(rel.name);
    }
  }

  return { kept, prunedNames };
} 