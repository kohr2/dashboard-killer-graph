export interface StructuredQuery {
  command: 'show' | 'unknown' | 'show_related';
  resourceTypes: string[];
  filters?: { [key: string]: string };
  relatedTo?: string[]; // The resource types from the previous context
  sourceEntityName?: string; // The specific entity name from the user's query
  relationshipType?: string; // The specific relationship to look for
} 