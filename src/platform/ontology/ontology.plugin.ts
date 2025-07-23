export interface OntologyPlugin {
  /** Unique identifier for the plugin (e.g. "crm", "financial") */
  name: string;

  /**
   * A record of entity schema definitions keyed by entity name.
   * Each value follows the same shape as entries in our "ontology.json" files
   * (description, parent, isProperty, properties, etc.).
   */
  entitySchemas: Record<string, unknown>;

  /**
   * A record of relationship schema definitions keyed by relationship name.
   * Each value defines domain, range, and description for the relationship.
   */
  relationshipSchemas?: Record<string, unknown>;

  /**
   * Optional reasoning algorithms defined for this ontology.
   * Contains algorithms that can be executed by the reasoning service.
   */
  reasoning?: {
    algorithms: Record<string, {
      name: string;
      description: string;
      entityType: string;
      factors?: string[];
      weights?: number[];
      threshold?: number;
      relationshipType?: string;
      pattern?: string;
      patternName?: string;
    }>;
  };

  /**
   * Optional set of provider tokens that the plugin wants to expose to the
   * application's dependency-injection container.
   * (Not leveraged in the minimal implementation to satisfy current tests.)
   */
  serviceProviders?: Record<string, unknown>;

  /**
   * Optional entity extraction configuration for this ontology.
   * Contains patterns and rules for extracting entities from text.
   */
  entityExtraction?: Record<string, unknown>;

  /**
   * Optional path alias configuration for this ontology.
   * Allows plugins to register their own path aliases for TypeScript imports.
   * Format: { "alias": "path" } where path is relative to the plugin directory.
   */
  pathAliases?: Record<string, string>;

  /**
   * Optional registration hook that gets called when the plugin is loaded.
   * Can be used for any plugin-specific initialization, including path alias registration.
   */
  onRegister?: () => void | Promise<void>;
} 