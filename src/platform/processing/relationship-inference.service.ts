import { singleton } from 'tsyringe';
import { logger } from '../../common/utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface InferredRelationship {
  type: string;
  source: string;
  target: string;
  confidence?: number;
  isInferred?: boolean; // Flag to indicate if this relationship was inferred (not in ontology)
}

export interface OntologyRelationship {
  name: string;
  source: string;
  target: string;
  description?: {
    _: string;
  };
  documentation?: string;
}

export interface Entity {
  id: string;
  type: string;
  name?: string;
  [key: string]: any;
}

export interface RelationshipInferenceOptions {
  ontologyName?: string;
  confidenceThreshold?: number;
  maxRelationships?: number;
  useLLM?: boolean; // Flag to enable LLM-based relationship inference
  llmService?: any; // LLM service interface
}

/**
 * Service responsible for inferring relationships between entities
 * based on ontology rules, co-occurrence patterns, and LLM analysis.
 * 
 * This service is ontology-agnostic and can work with any ontology
 * or even without an ontology by using LLM-based inference.
 */
@singleton()
export class RelationshipInferenceService {
  private readonly DEFAULT_CONFIDENCE = 0.8;
  private readonly DEFAULT_MAX_RELATIONSHIPS = 100;

  /**
   * Infers relationships between entities using ontology rules and/or LLM analysis.
   * This post-processing step creates relationships that the NLP service might not extract explicitly.
   * The method is ontology-agnostic and can work with or without an ontology.
   */
  async inferRelationships(
    entities: Entity[], 
    options: RelationshipInferenceOptions = {}
  ): Promise<InferredRelationship[]> {
    const {
      ontologyName,
      confidenceThreshold = this.DEFAULT_CONFIDENCE,
      maxRelationships = this.DEFAULT_MAX_RELATIONSHIPS,
      useLLM = false,
      llmService
    } = options;

    const inferredRelationships: InferredRelationship[] = [];

    // Load ontology relationships if ontologyName is provided
    const ontologyRelationships = await this.loadOntologyRelationships(ontologyName);
    const ontologyRelationshipNames = new Set(ontologyRelationships.map(r => r.name));

    // Apply ontology-based rules if ontology exists
    if (ontologyRelationships.length > 0) {
      const ontologyRules = this.createOntologyRules(ontologyRelationships);
      const ontologyInferredRelationships = this.applyOntologyRules(entities, ontologyRules, confidenceThreshold);
      inferredRelationships.push(...ontologyInferredRelationships);
    }

    // Apply LLM-based inference if enabled
    if (useLLM && llmService) {
      // DEBUG: Log entities and prompt
      logger.info('[DEBUG] Entities passed to LLM inference:', JSON.stringify(entities, null, 2));
      const prompt = this.createLLMInferencePrompt(entities);
      logger.info('[DEBUG] LLM prompt:', prompt);
      const response = await llmService.generateResponse(prompt);
      logger.info('[DEBUG] LLM raw response:', response);
      const llmRelationships = this.parseLLMResponse(response, entities, ontologyRelationshipNames);
      logger.info('[DEBUG] Parsed LLM relationships:', JSON.stringify(llmRelationships, null, 2));
      // Mark relationships not in ontology with double label format
      const inferredLLMRelationships: InferredRelationship[] = llmRelationships.map(rel => {
        const isInOntology = ontologyRelationshipNames.has(rel.type);
        return {
          ...rel,
          type: isInOntology ? rel.type : `${rel.type}:INFERRED`,
          isInferred: !isInOntology,
          confidence: rel.confidence || confidenceThreshold * 0.8 // Lower confidence for LLM-inferred relationships
        };
      });
      logger.info('[DEBUG] Inferred LLM relationships after labeling:', JSON.stringify(inferredLLMRelationships, null, 2));
      inferredRelationships.push(...inferredLLMRelationships);
    }

    // Validate and deduplicate relationships
    const validRelationships = this.validateInferredRelationships(inferredRelationships, entities);
    logger.info('[DEBUG] Valid relationships after validation:', JSON.stringify(validRelationships, null, 2));
    const uniqueRelationships = this.deduplicateRelationships(validRelationships);

    // Limit the number of relationships if specified
    const limitedRelationships = uniqueRelationships.slice(0, maxRelationships);

    logger.info(`Inferred ${limitedRelationships.length} relationships from ${entities.length} entities`);
    return limitedRelationships;
  }

  /**
   * Applies LLM-based inference to generate relationships not in the ontology
   */
  private async applyLLMInference(
    entities: Entity[],
    llmService: any,
    ontologyRelationshipNames: Set<string>,
    confidenceThreshold: number
  ): Promise<InferredRelationship[]> {
    try {
      const prompt = this.createLLMInferencePrompt(entities);
      const response = await llmService.generateResponse(prompt);
      
      const llmRelationships = this.parseLLMResponse(response, entities, ontologyRelationshipNames);
      
      // Mark relationships not in ontology with double label format
      const inferredRelationships: InferredRelationship[] = llmRelationships.map(rel => {
        const isInOntology = ontologyRelationshipNames.has(rel.type);
        return {
          ...rel,
          type: isInOntology ? rel.type : `${rel.type}:INFERRED`,
          isInferred: !isInOntology,
          confidence: rel.confidence || confidenceThreshold * 0.8 // Lower confidence for LLM-inferred relationships
        };
      });

      logger.info(`LLM inferred ${inferredRelationships.length} relationships`);
      return inferredRelationships;
    } catch (error) {
      logger.warn('LLM inference failed:', error);
      return [];
    }
  }

  /**
   * Creates a prompt for LLM-based relationship inference
   */
  private createLLMInferencePrompt(entities: Entity[]): string {
    const entityList = entities.map(e => `- ${e.type}: ${e.name || e.id}`).join('\n');
    
    return `You are an expert in relationship extraction and ontology analysis. 

Given the following entities found in a document, identify potential relationships between them. Consider:

1. **Direct relationships**: Where entities explicitly relate to each other
2. **Implicit relationships**: Where relationships can be logically inferred from context
3. **Role-based relationships**: Where entities play specific roles that create relationships
4. **Process relationships**: Where entities are part of the same process
5. **Organizational relationships**: Where entities have hierarchical or organizational connections
6. **Business relationships**: Where entities interact in business contexts

**Entities:**
${entityList}

**Task:**
Analyze these entities and identify relationships between them. For each relationship, provide:
- A descriptive relationship name (use camelCase format)
- The source entity
- The target entity
- A brief explanation of why this relationship exists

**Output Format:**
Return your analysis as a JSON array:

\`\`\`json
[
  {
    "relationshipName": "relationshipNameInCamelCase",
    "sourceEntity": "entity_id",
    "targetEntity": "entity_id",
    "explanation": "Brief explanation of the relationship"
  }
]
\`\`\`

Focus on meaningful relationships that would be useful for understanding the connections between these entities.`;
  }

  /**
   * Parses LLM response to extract relationships
   */
  private parseLLMResponse(
    response: string, 
    entities: Entity[], 
    ontologyRelationshipNames: Set<string>
  ): InferredRelationship[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\s*(\[.*?\])\s*```/s);
      if (!jsonMatch) {
        logger.warn('No JSON found in LLM response');
        return [];
      }

      const relationships = JSON.parse(jsonMatch[1]);
      const entityIds = new Set(entities.map(e => e.id));

      return relationships
        .filter((rel: any) => 
          rel.relationshipName && 
          rel.sourceEntity && 
          rel.targetEntity &&
          entityIds.has(rel.sourceEntity) &&
          entityIds.has(rel.targetEntity)
        )
        .map((rel: any) => ({
          type: rel.relationshipName,
          source: rel.sourceEntity,
          target: rel.targetEntity,
          confidence: 0.7 // Default confidence for LLM-inferred relationships
        }));
    } catch (error) {
      logger.warn('Failed to parse LLM response:', error);
      return [];
    }
  }

  /**
   * Loads relationships from ontology.json file
   */
  private async loadOntologyRelationships(ontologyName?: string): Promise<OntologyRelationship[]> {
    if (!ontologyName) {
      return [];
    }

    try {
      const ontologyPath = join(process.cwd(), 'ontologies', ontologyName, 'ontology.json');
      
      // Check if file exists
      try {
        await fs.access(ontologyPath);
      } catch {
        logger.warn(`Ontology file not found: ${ontologyPath}`);
        return [];
      }

      const content = await fs.readFile(ontologyPath, 'utf8');
      const ontologyData = JSON.parse(content);
      const relationships = ontologyData.relationships || [];
      
      logger.info(`Loaded ${relationships.length} relationships from ${ontologyName} ontology`);
      return relationships;
    } catch (error) {
      logger.warn(`Failed to load ontology relationships for ${ontologyName}:`, error);
      return [];
    }
  }

  /**
   * Creates inference rules based on ontology relationships
   */
  private createOntologyRules(ontologyRelationships: OntologyRelationship[]) {
    return ontologyRelationships.map(rel => ({
      condition: (entities: Entity[]) => 
        entities.some(e => e.type === rel.source) &&
        entities.some(e => e.type === rel.target),
      relationship: {
        type: rel.name,
        sourceType: [rel.source],
        targetType: [rel.target]
      }
    }));
  }

  /**
   * Applies ontology rules to entities to infer relationships
   */
  private applyOntologyRules(
    entities: Entity[], 
    rules: any[], 
    confidenceThreshold: number
  ): InferredRelationship[] {
    const inferredRelationships: InferredRelationship[] = [];

    rules.forEach(rule => {
      if (rule.condition(entities)) {
        const sourceEntity = entities.find(e => rule.relationship.sourceType.includes(e.type));
        const targetEntity = entities.find(e => rule.relationship.targetType.includes(e.type));
        
        if (sourceEntity && targetEntity) {
          inferredRelationships.push({
            type: rule.relationship.type,
            source: sourceEntity.id,
            target: targetEntity.id,
            confidence: confidenceThreshold,
            isInferred: false // Ontology relationships are not inferred
          });
        }
      }
    });

    return inferredRelationships;
  }

  /**
   * Validates that inferred relationships are valid
   */
  validateInferredRelationships(
    relationships: InferredRelationship[], 
    entities: Entity[]
  ): InferredRelationship[] {
    const validEntityIds = new Set(entities.map(e => e.id));
    
    return relationships.filter(rel => {
      const isValid = validEntityIds.has(rel.source) && validEntityIds.has(rel.target);
      if (!isValid) {
        logger.warn(`Invalid relationship found: ${rel.source} -> ${rel.target} (entities not found)`);
      }
      return isValid;
    });
  }

  /**
   * Removes duplicate relationships based on source, target, and type
   */
  deduplicateRelationships(relationships: InferredRelationship[]): InferredRelationship[] {
    const seen = new Set<string>();
    const unique: InferredRelationship[] = [];

    relationships.forEach(rel => {
      const key = `${rel.type}:${rel.source}:${rel.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rel);
      }
    });

    return unique;
  }

  /**
   * Gets statistics about the inference process
   */
  getInferenceStats(
    entities: Entity[], 
    relationships: InferredRelationship[]
  ): {
    entityCount: number;
    relationshipCount: number;
    averageConfidence: number;
    entityTypes: string[];
    relationshipTypes: string[];
    ontologyRelationships: number;
    inferredRelationships: number;
  } {
    const entityTypes = [...new Set(entities.map(e => e.type))];
    const relationshipTypes = [...new Set(relationships.map(r => r.type))];
    const averageConfidence = relationships.length > 0 
      ? relationships.reduce((sum, r) => sum + (r.confidence || 0), 0) / relationships.length 
      : 0;
    
    const ontologyRelationships = relationships.filter(r => !r.isInferred).length;
    const inferredRelationships = relationships.filter(r => r.isInferred).length;

    return {
      entityCount: entities.length,
      relationshipCount: relationships.length,
      averageConfidence,
      entityTypes,
      relationshipTypes,
      ontologyRelationships,
      inferredRelationships
    };
  }
} 