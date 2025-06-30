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
   * Optional set of provider tokens that the plugin wants to expose to the
   * application's dependency-injection container.
   * (Not leveraged in the minimal implementation to satisfy current tests.)
   */
  serviceProviders?: Record<string, unknown>;
} 