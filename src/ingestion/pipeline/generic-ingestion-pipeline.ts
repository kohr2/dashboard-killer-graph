export interface IngestionInput {
  id: string;
  content: string;
  meta?: Record<string, any>;
}

export interface IngestionResult {
  entities: any[];
  relationships: any[];
}

/**
 * GenericIngestionPipeline
 * -----------------------
 * Minimal orchestration wrapper used by CLI scripts, tests, and higher-level services.
 * – Accepts an array of `IngestionInput` objects.
 * – Delegates text-level processing to any service exposing `processContentBatch`.
 * – Delegates DB write-back to any service exposing `ingestEntitiesAndRelationships`.
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
    for (const result of results) {
      await this.neo4jService.ingestEntitiesAndRelationships(result);
    }

    if (this.reasoningOrchestrator) {
      await this.reasoningOrchestrator.executeAllReasoning();
    }
  }
} 