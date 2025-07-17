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
  private readonly batchSize: number;

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
    batchSize: number = 10,
  ) {
    this.processingService = processingService;
    this.neo4jService = neo4jService;
    this.reasoningOrchestrator = reasoningOrchestrator;
    this.extractor = extractor;
    this.ontologyName = ontologyName;
    this.batchSize = batchSize;
  }

  /**
   * Runs the full ingestion for the provided inputs.
   */
  public async run(inputs: IngestionInput[]): Promise<void> {
    const contents = inputs.map(this.extractor);
    const results = await this.processingService.processContentBatch(contents, this.ontologyName);
    
    // Process results in batches sequentially to avoid Neo4j session conflicts
    for (let i = 0; i < results.length; i += this.batchSize) {
      const batchResults = results.slice(i, i + this.batchSize);
      const batchInputs = inputs.slice(i, i + this.batchSize);
      
      // Process each batch sequentially but prepare all results first
      const batchPromises = batchResults.map((result, batchIndex) => {
        const inputIndex = i + batchIndex;
        const input = batchInputs[batchIndex];
        
        // Infer relationships based on ontology patterns
        const inferredRelationships = this.inferRelationships(result.entities);
        
        // Merge extracted and inferred relationships
        const mergedResult = {
          ...result,
          relationships: [...(result.relationships || []), ...inferredRelationships],
          metadata: input.meta || {}
        };
        
        return mergedResult;
      });
      
      // Wait for all results in the batch to be prepared, then ingest them
      const preparedResults = await Promise.all(batchPromises);
      
      // Ingest all results in the batch
      for (const result of preparedResults) {
        await this.neo4jService.ingestEntitiesAndRelationships(result);
      }
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
      
      // Create inferred relationships between entities that match ontology patterns
      const inferred: any[] = [];
      const createdRelationships = new Set<string>(); // Track created relationships to avoid duplicates
      
      for (const rel of relationships) {
        if (rel.source && rel.target) {
          // Check if we have entities that match the source and target patterns
          const sourceEntities = entities.filter(e => e.type === rel.source);
          const targetEntities = entities.filter(e => e.type === rel.target);
          
          if (sourceEntities.length > 0 && targetEntities.length > 0) {
            const relationshipKey = `${rel.name}:${sourceEntities[0].id}:${targetEntities[0].id}`;
            
            // Only create if we haven't already created this relationship
            if (!createdRelationships.has(relationshipKey)) {
              inferred.push({
                source: sourceEntities[0].id,
                target: targetEntities[0].id,
                type: rel.name,
                confidence: 0.8
              });
              createdRelationships.add(relationshipKey);
            }
          }
        }
      }
      
      return inferred;
    } catch (error) {
      return [];
    }
  }
} 