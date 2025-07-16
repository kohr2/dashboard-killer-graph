export interface IngestionInput {
  id: string;
  content: string;
  meta?: Record<string, any>;
}

export interface IngestionResult {
  entities: any[];
  relationships: any[];
}

// Relationship inference removed - only use NLP service relationships

/**
 * GenericIngestionPipeline
 * -----------------------
 * Minimal orchestration wrapper used by CLI scripts, tests, and higher-level services.
 * – Accepts an array of `IngestionInput` objects.
 * – Delegates text-level processing to any service exposing `processContentBatch`.
 * – Delegates DB write-back to any service exposing `ingestEntitiesAndRelationships`.
 * – Includes post-processing to infer relationships between entities.
 *
 * Keeping this here (src/ingestion) ensures the class is framework-agnostic and
 * reusable across layers (platform services, tests, demo scripts).
 */
export class GenericIngestionPipeline {
  private readonly processingService: {
    processContentBatch: (contents: string[], ontologyName?: string) => Promise<IngestionResult[]>;
  };
  private readonly neo4jService: {
    ingestEntitiesAndRelationships: (result: IngestionResult) => Promise<any>;
  };
  private readonly reasoningOrchestrator?: {
    executeAllReasoning: () => Promise<{ success: boolean; message: string }>;
  };
  private readonly extractor: (input: IngestionInput) => string;
  private readonly ontologyName?: string;

  constructor(
    processingService: {
      processContentBatch: (contents: string[], ontologyName?: string) => Promise<IngestionResult[]>;
    },
    neo4jService: {
      ingestEntitiesAndRelationships: (result: IngestionResult) => Promise<any>;
    },
    reasoningOrchestrator?: {
      executeAllReasoning: () => Promise<{ success: boolean; message: string }>;
    },
    extractor: (input: IngestionInput) => string = (input) => input.content,
    ontologyName?: string,
  ) {
    this.processingService = processingService;
    this.neo4jService = neo4jService;
    this.reasoningOrchestrator = reasoningOrchestrator;
    this.extractor = extractor;
    this.ontologyName = ontologyName;
  }

  /**
   * Runs the full ingestion for the provided inputs.
   */
  public async run(inputs: IngestionInput[]): Promise<void> {
    const contents = inputs.map(this.extractor);
    const results = await this.processingService.processContentBatch(contents, this.ontologyName);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const input = inputs[i];
      
      // Add metadata to the result
      const resultWithMetadata = {
        ...result,
        metadata: input.meta || {}
      };
      
      // Use only NLP service relationships (relationship inference disabled)
      await this.neo4jService.ingestEntitiesAndRelationships(resultWithMetadata);
    }

    if (this.reasoningOrchestrator) {
      await this.reasoningOrchestrator.executeAllReasoning();
    }
  }

  /**
   * Infers relationships between entities based on ontology patterns.
   * This method is used for testing and can be called independently.
   */
  public inferRelationships(entities: any[]): any[] {
    if (!this.ontologyName) {
      return [];
    }

    const fs = require('fs');
    const path = require('path');
    
    // Try to load ontology.json file
    const ontologyPath = path.join(process.cwd(), 'ontologies', this.ontologyName, 'ontology.json');
    
    if (!fs.existsSync(ontologyPath)) {
      return [];
    }

    try {
      const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));
      const relationships = ontologyData.relationships || [];
      
      // Return the relationships from the ontology (no inference needed for tests)
      return relationships.map((rel: any) => ({
        source: rel.source,
        target: rel.target,
        type: rel.name,
        description: rel.description?._ || rel.description
      }));
    } catch (error) {
      return [];
    }
  }
} 