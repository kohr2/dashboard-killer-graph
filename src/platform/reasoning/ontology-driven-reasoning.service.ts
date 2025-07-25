import { singleton } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';

@singleton() // Temporarily commented out for testing
export class OntologyDrivenReasoningService {
  constructor(
    private ontologyService: OntologyService,
    private connection: Neo4jConnection
  ) {}

  async executeAllReasoning(): Promise<void> {
    const ontologies = this.ontologyService.getAllOntologies();
    for (const ontology of ontologies) {
      await this.executeOntologyReasoning(ontology);
    }
  }

  async executeOntologyReasoning(ontology: any): Promise<void> {
    const session = this.connection.getDriver().session();
    try {
      const algorithms = ontology.reasoning?.algorithms || {};
      for (const algoName in algorithms) {
        const algo = algorithms[algoName];
        const query = this.buildQueryFromAlgorithm(algo, ontology);
        if (query) {
          await session.run(query);
        }
      }
    } finally {
      await session.close();
    }
  }

  buildQueryFromAlgorithm(algo: any, ontology: any): string | null {
    // Generic similarity scoring - works with any entity type
    if ((algo.name === 'similarity_scoring' || algo.name === 'lot_similarity') && algo.entityType && ontology.entities[algo.entityType]) {
      const entityType = algo.entityType;
      const factors = algo.factors.map((f: string, i: number) =>
        `CASE WHEN e1.${f} = e2.${f} THEN ${algo.weights[i]} ELSE 0 END`
      ).join(' + ');
      const relationshipType = algo.relationshipType || `${entityType.toUpperCase()}_SIMILARITY`;
      
      return `
        MATCH (e1:${entityType}), (e2:${entityType})
        WHERE e1 <> e2 AND NOT (e1)-[:${relationshipType}]->(e2)
        WITH e1, e2, (${factors}) as similarity_score
        WHERE similarity_score > ${algo.threshold}
        CREATE (e1)-[:${relationshipType} {score: similarity_score, calculated_at: datetime()}]->(e2)
      `;
    }
    
    // Generic risk assessment - works with any entity type
    if (algo.name === 'risk_assessment' && algo.entityType && ontology.entities[algo.entityType]) {
      const entityType = algo.entityType;
      const factors = algo.factors.map((f: string, i: number) =>
        `CASE WHEN e.${f} IS NOT NULL THEN ${algo.weights[i]} * e.${f} ELSE 0 END`
      ).join(' + ');
      
      return `
        MATCH (e:${entityType})
        WHERE e.risk_score IS NULL
        SET e.risk_score = (${factors})
        SET e.risk_assessed_at = datetime()
      `;
    }
    
    // Generic pattern detection - works with any entity type
    if (algo.name === 'pattern_detection' && algo.entityType && ontology.entities[algo.entityType]) {
      const entityType = algo.entityType;
      const pattern = algo.pattern;
      const relationshipType = algo.relationshipType || 'FOLLOWS_PATTERN';
      
      return `
        MATCH (e:${entityType})
        WHERE ${pattern}
        CREATE (e)-[:${relationshipType} {pattern: '${algo.patternName}', detected_at: datetime()}]->(p:Pattern {name: '${algo.patternName}'})
      `;
    }
    
    // Add more generic patterns as needed, or return null if not supported
    return null;
  }
} 