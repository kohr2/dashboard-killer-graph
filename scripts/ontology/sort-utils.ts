/**
 * Utility helpers to alphabetically sort ontology entities and relationships.
 * These helpers are kept free-standing so they can be unit-tested in isolation
 * and reused from multiple build scripts.
 */

export interface NamedItem {
  name: string;
  [key: string]: any;
}

/**
 * Return a *new* array with items ordered by their `name` property (A-Z).
 * The original input array remains unchanged.
 */
export function sortNamedArray<T extends NamedItem>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Return a *new* object whose keys are alphabetically ordered (A-Z).
 * The original input object remains unchanged.
 */
export function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {};
  Object.keys(record)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach((key) => {
      sorted[key] = record[key];
    });
  return sorted;
}

/**
 * Deep-sort an ontology entity record. Entities themselves are ordered alphabetically
 * and each entity's `properties` map is also ordered A-Z.
 */
// NOTE: deprecated duplicate, kept commented to avoid redefinition errors
// function _legacySortEntityProperties<T extends { properties?: Record<string, any> }>(entities: Record<string, T>): Record<string, T> {

export function sortEntityProperties<T extends { properties?: Record<string, any>; keyProperties?: string[] }>(
  entities: Record<string, T>
): Record<string, T> {
  const sorted: Record<string, T> = {};

  Object.keys(entities)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach((entityName) => {
      const original = entities[entityName];
      const entity: T = { ...original };

      // Ensure the object exists
      if (!entity.properties) {
        entity.properties = {} as Record<string, any>;
      }

      // Guarantee every keyProperty is also listed under `properties`
      if (Array.isArray(entity.keyProperties)) {
        entity.keyProperties.forEach((kp) => {
          if (!(kp in (entity.properties as Record<string, any>))) {
            // Minimal placeholder – refine later if needed
            (entity.properties as Record<string, any>)[kp] = {
              type: 'string',
              description: `Key property '${kp}' (auto-added)`,
            };
          }
        });
      }

      // Alphabetically sort the (possibly augmented) properties map
      entity.properties = sortRecord(entity.properties as Record<string, any>);

      sorted[entityName] = entity;
    });

  return sorted;
} 