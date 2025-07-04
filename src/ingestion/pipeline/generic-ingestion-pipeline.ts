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
    processContentBatch: (contents: string[]) => Promise<IngestionResult[]>;
  };
  private readonly neo4jService: {
    ingestEntitiesAndRelationships: (result: IngestionResult) => Promise<any>;
  };
  private readonly extractor: (input: IngestionInput) => string;

  constructor(
    processingService: {
      processContentBatch: (contents: string[]) => Promise<IngestionResult[]>;
    },
    neo4jService: {
      ingestEntitiesAndRelationships: (result: IngestionResult) => Promise<any>;
    },
    extractor: (input: IngestionInput) => string = (input) => input.content,
  ) {
    this.processingService = processingService;
    this.neo4jService = neo4jService;
    this.extractor = extractor;
  }

  /**
   * Runs the full ingestion for the provided inputs.
   */
  public async run(inputs: IngestionInput[]): Promise<void> {
    const contents = inputs.map(this.extractor);
    const results = await this.processingService.processContentBatch(contents);
    for (const result of results) {
      await this.neo4jService.ingestEntitiesAndRelationships(result);
    }
  }
} 