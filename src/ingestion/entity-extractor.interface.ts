export interface EntityExtraction {
  entities: Array<{ id: string; name: string; type: string }>;
  relationships: Array<unknown>;
}

export interface EntityExtractor {
  /**
   * Extract entities and relationships from a plain-text input.
   */
  extract(text: string): Promise<EntityExtraction>;
} 