export interface IngestionInput {
  id: string;
  content: string;
  meta?: Record<string, any>;
}

export interface IngestionResult {
  entities: any[];
  relationships: any[];
}

export class GenericIngestionPipeline {
  private processingService: { processContentBatch: (contents: string[]) => Promise<IngestionResult[]> };
  private neo4jService: { ingestEntitiesAndRelationships: (result: IngestionResult) => Promise<any> };
  private extractor: (input: IngestionInput) => string;

  constructor(
    processingService: { processContentBatch: (contents: string[]) => Promise<IngestionResult[]> },
    neo4jService: { ingestEntitiesAndRelationships: (result: IngestionResult) => Promise<any> },
    extractor?: (input: IngestionInput) => string
  ) {
    this.processingService = processingService;
    this.neo4jService = neo4jService;
    this.extractor = extractor || ((input: IngestionInput) => input.content);
  }

  async run(inputs: IngestionInput[]): Promise<void> {
    const contents = inputs.map(this.extractor);
    const results = await this.processingService.processContentBatch(contents);
    for (const result of results) {
      await this.neo4jService.ingestEntitiesAndRelationships(result);
    }
  }
} 