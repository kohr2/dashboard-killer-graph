export function flattenEnrichmentData(enrichedData: any): Record<string, any> {
  if (!enrichedData || typeof enrichedData !== 'object') {
    return {};
  }

  const flattened: Record<string, any> = {};

  /**
   * Recursively walks through an object tree, extracting primitive values (string, number, boolean)
   * and specially handling `address` blocks by converting them to a single formatted string.
   */
  const walk = (node: Record<string, any>) => {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'address' && value && typeof value === 'object' && !Array.isArray(value)) {
        const addr = value as Record<string, any>;
        const street = addr.street1 || addr.street || '';
        const city = addr.city || '';
        const state = addr.stateOrCountry || addr.state || '';
        const zip = addr.zipCode || addr.zip || '';
        const stateZip = state && zip ? `${state} ${zip}` : state || zip;
        const parts = [street, city, stateZip].filter(Boolean);
        flattened.address = parts.join(', ').trim();
        continue;
      }

      // Primitive or array (of primitives) -> copy
      if (
        value === null ||
        typeof value !== 'object' ||
        Array.isArray(value)
      ) {
        // Keep only primitive or array values – skip functions / undefined
        if (value !== undefined && typeof value !== 'function') {
          flattened[key] = value;
        }
        continue;
      }

      // For any nested object that isn't an address, recurse.
      walk(value);
    }
  };

  // Process the root object directly
  walk(enrichedData);

  return flattened;
}

export function mergeEnrichedData(
  existingProps: Record<string, any>,
  enrichedData: any,
): Record<string, any> {
  const flattened = flattenEnrichmentData(enrichedData);
  return {
    ...existingProps,
    ...flattened,
  };
} 