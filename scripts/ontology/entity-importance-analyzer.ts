import axios from 'axios';

// Simple logger for scripts context
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args)
};

/**
 * Ontology-agnostic entity importance analysis service.
 *
 * This service analyzes the importance of entities and relationships using LLMs or fallback heuristics.
 * It is designed to work with any ontology, schema, or entity set, regardless of domain.
 *
 * Usage:
 *   - Pass in any array of entities/relationships with at least a name and optional description/properties.
 *   - Optionally provide a domain/context string to guide the LLM (e.g., 'financial', 'procurement', etc.),
 *     or leave blank for generic analysis.
 */
export interface EntityImportanceAnalysis {
  entityName: string;
  importanceScore: number;
  reasoning: string;
  businessRelevance: string;
  domainSignificance: string;
}

export interface RelationshipImportanceAnalysis {
  relationshipName: string;
  importanceScore: number;
  reasoning: string;
  businessRelevance: string;
}

export class EntityImportanceAnalyzer {
  private nlpServiceUrl: string;

  constructor() {
    this.nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Analyze entity importance using LLM (ontology-agnostic)
   */
  async analyzeEntityImportance(
    entities: Array<{ name: string; description?: string; properties?: Record<string, any> }>,
    context?: string,
    maxEntities: number = 100
  ): Promise<EntityImportanceAnalysis[]> {
    try {
      logger.info(`Analyzing importance of ${entities.length} entities${context ? ` for context: ${context}` : ''}`);

      // Prepare entity data for LLM analysis
      const entityData = entities.map(entity => ({
        name: entity.name,
        description: entity.description || 'No description available',
        properties: entity.properties || {}
      }));

      // Create prompt for LLM analysis
      const prompt = this.createEntityAnalysisPrompt(entityData, context, maxEntities);

      // Call LLM service for analysis
      const response = await axios.post(
        `${this.nlpServiceUrl}/analyze-entity-importance`,
        {
          prompt,
          context,
          max_entities: maxEntities,
          entities: entityData
        },
        { timeout: 120000 }
      );

      const analysis = response.data.analysis as EntityImportanceAnalysis[];
      
      // Sort by importance score (descending)
      analysis.sort((a, b) => b.importanceScore - a.importanceScore);

      logger.info(`Completed importance analysis for ${analysis.length} entities`);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing entity importance:', error);
      
      // Fallback: return entities with basic scoring based on generic heuristics
      return this.fallbackEntityAnalysis(entities, context, maxEntities);
    }
  }

  /**
   * Analyze relationship importance using LLM (ontology-agnostic)
   */
  async analyzeRelationshipImportance(
    relationships: Array<{ name: string; description?: string; sourceType?: string; targetType?: string }>,
    context?: string,
    maxRelationships: number = 100
  ): Promise<RelationshipImportanceAnalysis[]> {
    try {
      logger.info(`Analyzing importance of ${relationships.length} relationships${context ? ` for context: ${context}` : ''}`);

      // Prepare relationship data for LLM analysis
      const relationshipData = relationships.map(rel => ({
        name: rel.name,
        description: rel.description || 'No description available',
        sourceType: rel.sourceType || 'Unknown',
        targetType: rel.targetType || 'Unknown'
      }));

      // Create prompt for LLM analysis
      const prompt = this.createRelationshipAnalysisPrompt(relationshipData, context, maxRelationships);

      // Call LLM service for analysis
      const response = await axios.post(
        `${this.nlpServiceUrl}/analyze-relationship-importance`,
        {
          prompt,
          context,
          max_relationships: maxRelationships,
          relationships: relationshipData
        },
        { timeout: 120000 }
      );

      const analysis = response.data.analysis as RelationshipImportanceAnalysis[];
      
      // Sort by importance score (descending)
      analysis.sort((a, b) => b.importanceScore - a.importanceScore);

      logger.info(`Completed importance analysis for ${analysis.length} relationships`);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing relationship importance:', error);
      
      // Fallback: return relationships with basic scoring based on generic heuristics
      return this.fallbackRelationshipAnalysis(relationships, context, maxRelationships);
    }
  }

  private createEntityAnalysisPrompt(
    entities: Array<{ name: string; description: string; properties: Record<string, any> }>,
    context: string | undefined,
    maxEntities: number
  ): string {
    const contextSection = context
      ? `**Domain/Context:** ${context}\n- Focus on entities fundamental to this context.\n- Consider business, operational, and conceptual significance.\n`
      : '**General Context:**\n- Focus on entities fundamental to the ontology or schema.\n- Consider business, operational, and conceptual significance.\n';
    
    return `You are an expert in ontology and knowledge graph analysis. Your task is to analyze the importance of entities in a given ontology or schema and rank them by business relevance and semantic significance.

${contextSection}

**Analysis Criteria:**
1. **Business Relevance**: How critical is this entity for real-world operations, compliance, or decision-making?
2. **Semantic Significance**: How fundamental is this entity to the conceptual model?
3. **Operational Impact**: How frequently would this entity be used in real-world scenarios?
4. **Regulatory/Reporting Importance**: How important is this entity for compliance or reporting?

**Entities to Analyze:**
${entities.map((entity, index) => `\n${index + 1}. **${entity.name}**\n   Description: ${entity.description}\n   Properties: ${Object.keys(entity.properties).join(', ') || 'None'}\n`).join('')}

**Instructions:**
- Analyze each entity based on the criteria above
- Assign an importance score from 0.0 to 1.0 (1.0 = most important)
- Provide clear reasoning for each score
- Select the top ${maxEntities} most important entities
- Consider the context and business use cases if provided

**Output Format:**
Return a JSON array of objects with the following structure:
[
  {
    "entityName": "EntityName",
    "importanceScore": 0.95,
    "reasoning": "Detailed explanation of why this entity is important",
    "businessRelevance": "Specific business use cases and impact",
    "domainSignificance": "Role in the conceptual model and relationships"
  }
]`;
  }

  private createRelationshipAnalysisPrompt(
    relationships: Array<{ name: string; description: string; sourceType: string; targetType: string }>,
    context: string | undefined,
    maxRelationships: number
  ): string {
    const contextSection = context
      ? `**Domain/Context:** ${context}\n- Focus on relationships fundamental to this context.\n- Consider business, operational, and conceptual significance.\n`
      : '**General Context:**\n- Focus on relationships fundamental to the ontology or schema.\n- Consider business, operational, and conceptual significance.\n';
    
    return `You are an expert in ontology and knowledge graph analysis. Your task is to analyze the importance of relationships in a given ontology or schema and rank them by business relevance and semantic significance.

${contextSection}

**Analysis Criteria:**
1. **Business Relevance**: How critical is this relationship for real-world operations, compliance, or decision-making?
2. **Semantic Significance**: How fundamental is this relationship to the conceptual model?
3. **Operational Impact**: How frequently would this relationship be used in real-world scenarios?

**Relationships to Analyze:**
${relationships.map((rel, index) => `\n${index + 1}. **${rel.name}**\n   Description: ${rel.description}\n   Source Type: ${rel.sourceType}\n   Target Type: ${rel.targetType}\n`).join('')}

**Instructions:**
- Analyze each relationship based on the criteria above
- Assign an importance score from 0.0 to 1.0 (1.0 = most important)
- Provide clear reasoning for each score
- Select the top ${maxRelationships} most important relationships
- Consider the context and business use cases if provided

**Output Format:**
Return a JSON array of objects with the following structure:
[
  {
    "relationshipName": "RelationshipName",
    "importanceScore": 0.95,
    "reasoning": "Detailed explanation of why this relationship is important",
    "businessRelevance": "Specific business use cases and impact"
  }
]`;
  }

  private fallbackEntityAnalysis(
    entities: Array<{ name: string; description?: string; properties?: Record<string, any> }>,
    context: string | undefined,
    maxEntities: number
  ): EntityImportanceAnalysis[] {
    logger.warn('Using fallback entity analysis due to LLM service unavailability');

    const analysis: EntityImportanceAnalysis[] = entities.map(entity => {
      // Basic scoring based on property count and description length
      let score = 0.5; // Base score
      
      // Boost score for entities with more properties
      const propertyCount = Object.keys(entity.properties || {}).length;
      score += Math.min(propertyCount * 0.05, 0.2);
      
      // Boost score for entities with longer descriptions
      const descriptionLength = entity.description?.length || 0;
      score += Math.min(descriptionLength / 1000, 0.1);
      
      // Cap score at 1.0
      score = Math.min(score, 1.0);

      return {
        entityName: entity.name,
        importanceScore: score,
        reasoning: `Fallback analysis based on property count (${propertyCount}) and description length (${descriptionLength})`,
        businessRelevance: 'Fallback analysis - business relevance not determined',
        domainSignificance: 'Fallback analysis - domain significance not determined'
      };
    });

    // Sort by score and limit to maxEntities
    analysis.sort((a, b) => b.importanceScore - a.importanceScore);
    return analysis.slice(0, maxEntities);
  }

  private fallbackRelationshipAnalysis(
    relationships: Array<{ name: string; description?: string; sourceType?: string; targetType?: string }>,
    context: string | undefined,
    maxRelationships: number
  ): RelationshipImportanceAnalysis[] {
    logger.warn('Using fallback relationship analysis due to LLM service unavailability');

    const analysis: RelationshipImportanceAnalysis[] = relationships.map(rel => {
      // Basic scoring based on description length
      let score = 0.5; // Base score
      
      // Boost score for relationships with longer descriptions
      const descriptionLength = rel.description?.length || 0;
      score += Math.min(descriptionLength / 500, 0.2);
      
      // Cap score at 1.0
      score = Math.min(score, 1.0);

      return {
        relationshipName: rel.name,
        importanceScore: score,
        reasoning: `Fallback analysis based on description length (${descriptionLength})`,
        businessRelevance: 'Fallback analysis - business relevance not determined'
      };
    });

    // Sort by score and limit to maxRelationships
    analysis.sort((a, b) => b.importanceScore - a.importanceScore);
    return analysis.slice(0, maxRelationships);
  }
} 