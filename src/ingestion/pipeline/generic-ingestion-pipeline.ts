export interface IngestionInput {
  id: string;
  content: string;
  meta?: Record<string, any>;
}

export interface IngestionResult {
  entities: any[];
  relationships: any[];
}

import { RelationshipInferenceService, InferredRelationship } from '@platform/processing/relationship-inference.service';

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
  private readonly relationshipInferenceService: RelationshipInferenceService;
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
    relationshipInferenceService?: RelationshipInferenceService,
    extractor: (input: IngestionInput) => string = (input) => input.content,
    ontologyName?: string,
  ) {
    this.processingService = processingService;
    this.neo4jService = neo4jService;
    this.reasoningOrchestrator = reasoningOrchestrator;
    this.relationshipInferenceService = relationshipInferenceService || new RelationshipInferenceService();
    this.extractor = extractor;
    this.ontologyName = ontologyName;
  }

  /**
   * Infers relationships between entities using the relationship inference service.
   * This post-processing step creates relationships that the NLP service might not extract explicitly.
   */
  private async inferRelationships(entities: any[]): Promise<InferredRelationship[]> {
    return await this.relationshipInferenceService.inferRelationships(entities, {
      ontologyName: this.ontologyName
    });
  }

  /**
   * Runs the full ingestion for the provided inputs.
   */
  public async run(inputs: IngestionInput[]): Promise<void> {
    const contents = inputs.map(this.extractor);
    const results = await this.processingService.processContentBatch(contents, this.ontologyName);
    
    for (const result of results) {
      // Post-process to infer relationships
      const inferredRelationships = await this.inferRelationships(result.entities);
      
      // Merge inferred relationships with existing ones
      const enhancedResult = {
        ...result,
        relationships: [
          ...result.relationships,
          ...inferredRelationships
        ]
      };
      
      await this.neo4jService.ingestEntitiesAndRelationships(enhancedResult);
    }

    if (this.reasoningOrchestrator) {
      await this.reasoningOrchestrator.executeAllReasoning();
    }
  }
} 