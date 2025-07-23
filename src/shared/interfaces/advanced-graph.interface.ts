export interface IAdvancedGraphService {
  /**
   * Apply ontology-specific advanced relationship configuration.
   */
  applyOntologyConfiguration(ontologyName: string): Promise<void>;
} 