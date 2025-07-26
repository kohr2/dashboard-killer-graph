import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import OpenAI from 'openai';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';
import type { StructuredQuery, ConversationTurn } from './query-translator.types';

// @injectable() // Temporarily commented out for testing
export class QueryTranslator {
  private openai: OpenAI;
  private semanticMappingsCache: { [key: string]: string[] } = {};
  private semanticMappingsGenerated = false;

  constructor(
    private readonly ontologyService: OntologyService,
    openai?: OpenAI,
  ) {
    if (openai) {
      this.openai = openai;
    } else {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set.');
      }
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  public async translate(
    rawQuery: string,
    history: ConversationTurn[] = []
  ): Promise<StructuredQuery> {
    // Ensure semantic mappings are generated if not already done
    if (!this.semanticMappingsGenerated) {
      await this.ensureSemanticMappingsGenerated();
    }
    // First try simple pattern matching for basic queries
    const simpleResult = await this.trySimplePatternMatching(rawQuery);
    if (simpleResult) {
      logger.info('Using simple pattern matching for query:', rawQuery);
      return simpleResult;
    }

    // Fallback to OpenAI for complex queries
    const validEntityTypesArray = this.ontologyService.getAllEntityTypes();
    const validEntityTypes = validEntityTypesArray.join(', ');
    const allAvailableLabels = this.ontologyService.getAllAvailableLabels();
    const availableLabels = allAvailableLabels.join(', ');
    const lastTurn = history.length > 0 ? history[history.length - 1] : null;

    let previousContext = 'No previous context.';
    if (lastTurn) {
        // Simple stringification for now. We can make this more robust.
        const previousResult = JSON.stringify(lastTurn.assistantResponse, null, 2);
        previousContext = `The user just asked: "${lastTurn.userQuery}"\nAnd the assistant returned these entities: ${previousResult}`;
    }

    const schemaDescription = this.ontologyService.getSchemaRepresentation();

    // Get ontology-specific prompts if available
    const ontologyPrompts = await this.getOntologyPrompts();
    const systemPrompt = ontologyPrompts?.queryTranslation?.systemPrompt || `
You are an expert at translating natural language queries into a structured JSON format.
Your task is to identify the user's intent and the target resource, considering the conversational history and the graph schema.

You have three commands:
1. 'show': For listing all resources of a certain type.
2. 'show_related': For listing resources related to the entities from the previous turn in the conversation, or for complex self-contained relational queries.
3. 'unknown': For anything else (greetings, general questions, etc.).

The supported resource types are: ${validEntityTypes}
Available labels (including alternative labels): ${availableLabels}
The user can write in any language.

# Rules:
- If the query is a stand-alone request (e.g., "show all deals"), use the 'show' command and populate 'resourceTypes'.
- If the query requests resources with specific properties (e.g., "find the person named Rick"), use the 'show' command and populate 'resourceTypes' and 'filters'.
- For a complex query that finds entities related to another entity described by properties (e.g., "find companies related to 'John Doe'"), use the 'show_related' command. You must populate 'resourceTypes' with the target entity type, 'relatedTo' with the source entity type, and 'filters' with the properties of the source entity.
- If the query refers to a previous result (e.g., "show their contacts"), use the 'show_related' command. You MUST set 'resourceTypes' to the type(s) of entity the user is asking for now. The 'relatedTo' field will be inferred from the context.
- For 'show_related', if you can't determine the new resourceTypes, classify the command as 'unknown'.
- For a query like "projets", if both 'Project' and 'Deal' seem plausible based on the ontology, return both in the 'resourceTypes' array.
- If the query refers to a *specific entity* from the history (e.g., "who is related to 'Project Alpha'"), you MUST also extract the 'sourceEntityName'.
- When using 'show_related', only infer a 'relationshipType' if the user's language is very specific (e.g., "who works on", "invested in"). Otherwise, omit it.
- If there's no history or the query doesn't relate to it, treat it as a new query.
- IMPORTANT: When the user uses alternative labels (like "Person" instead of "Contact"), map them to the correct entity types. For example, if "Person" is an alternative label for "Contact", use "Contact" in the resourceTypes.

# Graph Schema
This is the structure of the knowledge graph you are querying:
${schemaDescription}

# Conversation History
${previousContext}

# Output Format
Provide the output in JSON format: {"command": "...", "resourceTypes": ["...", "..."], "filters": {"key": "value"}, "relatedTo": ["..."], "sourceEntityName": "...", "relationshipType": "..."}.
'filters', 'relatedTo', 'sourceEntityName' and 'relationshipType' are optional.

# Examples:
## Stand-alone query for a specific type
- User: "list all deals"
- Assistant: {"command": "show", "resourceTypes": ["Deal"]}

## Stand-alone query with filter
- User: "trouve la personne qui s'appelle Lisa"
- Assistant: {"command": "show", "resourceTypes": ["Contact"], "filters": {"name": "Lisa"}}

## Query using alternative label
- User: "show all persons"
- Assistant: {"command": "show", "resourceTypes": ["Contact"]}

## Complex stand-alone relational query
- User: "quelles organisations sont liées à la personne nommée Rick?"
- Assistant: {"command": "show_related", "resourceTypes": ["Organization"], "relatedTo": ["Contact"], "filters": {"name": "Rick"}}

## Complex stand-alone relational query (FR)
- User: "liste moi les projets liés à Offshore Holdings Ltd."
- Assistant: {"command": "show_related", "resourceTypes": ["Project", "Deal"], "relatedTo": ["Organization"], "filters": {"name": "Offshore Holdings Ltd."}}

## Stand-alone query for an ambiguous type
- User: "montre moi les projets"
- Assistant: {"command": "show", "resourceTypes": ["Deal", "Project"]}

## General follow-up query
- (After getting a list of Organizations, one of which is 'Offshore Holdings Ltd.') User: "je cherche les projets liés"
- Assistant: {"command": "show_related", "resourceTypes": ["Project", "Deal"], "relatedTo": ["Organization"], "sourceEntityName": "Offshore Holdings Ltd."}

## Specific follow-up query with relationship
- (After getting a list of Deals, one of which is 'Project Alpha') User: "who works on Project Alpha?"
- Assistant: {"command": "show_related", "resourceTypes": ["Contact"], "relatedTo": ["Deal"], "sourceEntityName": "Project Alpha", "relationshipType": "WORKS_ON"}

## Vague follow-up query
- (After getting a list of Deals) User: "what about the people?"
- Assistant: {"command": "show_related", "resourceTypes": ["Contact"], "relatedTo": ["Deal"]}

## Unrelated follow-up
- (After getting a list of Deals) User: "show all organizations"
- Assistant: {"command": "show", "resourceTypes": ["Organization"]}

## Vague follow-up
- (After getting a list of Deals) User: "and what else?"
- Assistant: {"command": "unknown", "resourceTypes": []}
`;

    // Replace placeholders in the prompt
    const finalSystemPrompt = systemPrompt
      .replace(/{validEntityTypes}/g, validEntityTypes)
      .replace(/{availableLabels}/g, availableLabels)
      .replace(/{schemaDescription}/g, schemaDescription)
      .replace(/{previousContext}/g, previousContext);

    try {
      logger.info('--- Sending to OpenAI ---');
      logger.info('User Query:', rawQuery);
      logger.info('Valid entity types:', validEntityTypes);
      logger.info('Schema description length:', schemaDescription.length);
      logger.info('System Prompt length:', systemPrompt.length);
      logger.info('-------------------------');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: rawQuery },
        ],
        response_format: { type: 'json_object' },
      });

      const result = completion.choices[0]?.message?.content;

      logger.info('--- Received from OpenAI ---');
      logger.info('Raw Response:', result);
      logger.info('----------------------------');

      if (!result) {
        throw new Error('OpenAI returned an empty response.');
      }

      const parsedResult: StructuredQuery = JSON.parse(result);
      logger.info('Parsed result:', JSON.stringify(parsedResult, null, 2));

      // Basic validation
      if (parsedResult.command === 'show' && (!parsedResult.resourceTypes || parsedResult.resourceTypes.some(rt => !validEntityTypesArray.includes(rt)))) {
        logger.warn('Invalid resource types in result, returning unknown');
        return { command: 'unknown', resourceTypes: [] };
      }
      
      // Limit to valid resource types that are known in the ontology
      const validResourceTypes =
        parsedResult.resourceTypes?.filter((rt: string) =>
          this.ontologyService.isValidLabel(rt),
        ) ?? [];

      return parsedResult;

    } catch (error) {
      logger.error('Error translating query with OpenAI:', error);
      logger.info('Falling back to simple pattern matching...');
      
      // Enhanced fallback: try simple pattern matching again
      const fallbackResult = await this.trySimplePatternMatching(rawQuery);
      if (fallbackResult) {
        logger.info('Using fallback pattern matching for query:', rawQuery);
        return fallbackResult;
      }
      
      // Final fallback to a safe default
      return { command: 'unknown', resourceTypes: [] };
    }
  }

  /**
   * Get ontology-specific prompts from config files
   */
  private async getOntologyPrompts(): Promise<any> {
    try {
      // Get all loaded ontologies from the ontology service
      const loadedOntologies = this.ontologyService.getAllOntologies();
      logger.info('Loaded ontologies:', loadedOntologies);
      
      // Merge prompts from all active ontologies
      const mergedPrompts: any = {};
      
      for (const ontologyName of loadedOntologies) {
        const fs = require('fs');
        const path = require('path');
        
        // Use absolute path to ensure we find the config file
        const configPath = path.join(process.cwd(), 'ontologies', ontologyName, 'config.json');
        
        logger.info(`Checking config path: ${configPath}`);
        logger.info(`File exists: ${fs.existsSync(configPath)}`);
        
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          
          logger.info(`Config has prompts: ${!!config.prompts}`);
          if (config.prompts) {
            logger.info(`Found prompts in ${ontologyName} config:`, Object.keys(config.prompts));
            
            // Merge prompts from this ontology
            for (const [key, value] of Object.entries(config.prompts)) {
              if (key === 'queryTranslation') {
                if (!mergedPrompts.queryTranslation) {
                  mergedPrompts.queryTranslation = {};
                }
                
                // Merge queryTranslation properties
                for (const [subKey, subValue] of Object.entries(value as any)) {
                  if (subKey === 'semanticMappings') {
                    // Merge semantic mappings (combine arrays)
                    if (!mergedPrompts.queryTranslation.semanticMappings) {
                      mergedPrompts.queryTranslation.semanticMappings = {};
                    }
                    
                    for (const [term, entityTypes] of Object.entries(subValue as any)) {
                      if (Array.isArray(entityTypes)) {
                        if (!mergedPrompts.queryTranslation.semanticMappings[term]) {
                          mergedPrompts.queryTranslation.semanticMappings[term] = [];
                        }
                        // Add new entity types without duplicates
                        for (const entityType of entityTypes) {
                          if (!mergedPrompts.queryTranslation.semanticMappings[term].includes(entityType)) {
                            mergedPrompts.queryTranslation.semanticMappings[term].push(entityType);
                          }
                        }
                      }
                    }
                  } else {
                    // For other properties, use the last one found (could be enhanced to merge)
                    mergedPrompts.queryTranslation[subKey] = subValue;
                  }
                }
              } else {
                // For other prompt types, use the last one found
                mergedPrompts[key] = value;
              }
            }
          }
        }
      }
      
      if (Object.keys(mergedPrompts).length > 0) {
        logger.info('Merged prompts from all ontologies:', Object.keys(mergedPrompts));
        if (mergedPrompts.queryTranslation?.semanticMappings) {
          logger.info('Semantic mappings found:', Object.keys(mergedPrompts.queryTranslation.semanticMappings));
        }
        return mergedPrompts;
      }
      
      logger.warn('No ontology prompts found in any config files');
      return null;
    } catch (error) {
      logger.warn('Failed to load ontology prompts:', error);
      return null;
    }
  }

  /**
   * Simple pattern matching for basic queries when OpenAI is not available
   */
  private async trySimplePatternMatching(query: string): Promise<StructuredQuery | null> {
    // Ensure semantic mappings are available before pattern matching
    if (!this.semanticMappingsGenerated) {
      logger.info('Generating semantic mappings for first time...');
      await this.ensureSemanticMappingsGenerated();
      logger.info('Semantic mappings generated, cache size:', Object.keys(this.semanticMappingsCache).length);
    }

    const normalizedQuery = query.toLowerCase().trim();
    const validEntityTypes = this.ontologyService.getAllEntityTypes();
    const allAvailableLabels = this.ontologyService.getAllAvailableLabels();
    
    logger.info('Pattern matching query:', normalizedQuery);
    logger.info('Available labels count:', allAvailableLabels.length);
    logger.info('Semantic mappings cache:', Object.keys(this.semanticMappingsCache));
    
    // Create a mapping from labels to entity types
    const labelToEntityType = new Map<string, string>();
    
    // Add direct entity types
    for (const entityType of validEntityTypes) {
      labelToEntityType.set(entityType.toLowerCase(), entityType);
    }
    
    // Add alternative labels
    for (const entityType of validEntityTypes) {
      const altLabels = this.ontologyService.getAlternativeLabels(entityType);
      for (const altLabel of altLabels) {
        // Ensure altLabel is a string
        if (typeof altLabel === 'string') {
          labelToEntityType.set(altLabel.toLowerCase(), entityType);
        }
      }
    }
    
    // Pattern 1: "relationships for [entity]" or "related to [entity]"
    const relationshipsPattern = /^(relationships|related|connections)\s+(for|to)\s+(.+?)(?:\s*$)/i;
    const relationshipsMatch = normalizedQuery.match(relationshipsPattern);
    
    if (relationshipsMatch) {
      const entityPart = relationshipsMatch[3].toLowerCase();
      logger.info('Extracted entity for relationships:', entityPart);
      
      // This should be a show_related command
      return {
        command: 'show_related',
        resourceTypes: ['*'], // All related entities
        relatedTo: ['*'], // Related to any entity type
        filters: { name: entityPart } // Filter by the entity name
      };
    }
    
    // Pattern 2: "show all [entity]" or "list all [entity]" - more flexible
    const showAllPattern = /^(show|list|get|find)\s+(all\s+)?(.+?)(?:\s*$)/i;
    const showMatch = normalizedQuery.match(showAllPattern);
    
    if (showMatch) {
      const entityPart = showMatch[3].toLowerCase();
      logger.info('Extracted entity part:', entityPart);
      
      // Check semantic mappings cache first (highest priority)
      const semanticMatch = this.semanticMappingsCache[entityPart];
      logger.info('Checking semantic mappings cache for:', entityPart);
      logger.info('Available semantic mappings:', Object.keys(this.semanticMappingsCache));
      logger.info('Semantic match result:', semanticMatch);
      if (semanticMatch && semanticMatch.length > 0) {
        logger.info('Semantic match found:', semanticMatch);
        return {
          command: 'show',
          resourceTypes: semanticMatch
        };
      }



      // Try to match against all available labels
      const matchedEntityType = labelToEntityType.get(entityPart);
      if (matchedEntityType && validEntityTypes.includes(matchedEntityType)) {
        logger.info('Direct match found:', matchedEntityType);
        return {
          command: 'show',
          resourceTypes: [matchedEntityType]
        };
      }
      
      // Generate dynamic entity mappings based on ontology
      const entityMappings = this.generateEntityMappings(validEntityTypes);
      
      const matchedTypes = entityMappings[entityPart];
      if (matchedTypes) {
        // Verify the types exist in the ontology
        const validTypes = matchedTypes.filter(type => validEntityTypes.includes(type));
        if (validTypes.length > 0) {
          logger.info('Entity mapping match found:', validTypes);
          return {
            command: 'show',
            resourceTypes: validTypes
          };
        }
      }
    }
    
    logger.info('No pattern match found for query:', query);
    return null;
  }

  /**
   * Generate dynamic entity mappings based on the ontology entities
   * This creates common language mappings for entity types found in the ontology
   */
  private generateEntityMappings(validEntityTypes: string[]): { [key: string]: string[] } {
    const entityMappings: { [key: string]: string[] } = {};

    // Only use actual ontology data - no hardcoded patterns
    for (const entityType of validEntityTypes) {
      const lowerEntityType = entityType.toLowerCase();

      // Map the entity type itself (singular and plural)
      entityMappings[lowerEntityType] = [entityType];
      entityMappings[lowerEntityType + 's'] = [entityType];
      
      // Handle common pluralization patterns
      if (lowerEntityType.endsWith('y')) {
        const singular = lowerEntityType.slice(0, -1);
        entityMappings[singular + 'ies'] = [entityType];
      }

      // Map all alternative labels from the ontology
      const alternativeLabels = this.ontologyService.getAlternativeLabels(entityType);
      for (const altLabel of alternativeLabels) {
        // Ensure altLabel is a string
        if (typeof altLabel === 'string') {
          const lowerAltLabel = altLabel.toLowerCase();
          entityMappings[lowerAltLabel] = [entityType];
          entityMappings[lowerAltLabel + 's'] = [entityType];
          
          // Handle pluralization for alternative labels
          if (lowerAltLabel.endsWith('y')) {
            const singular = lowerAltLabel.slice(0, -1);
            entityMappings[singular + 'ies'] = [entityType];
          }
        }
      }
    }

        // Add cached semantic mappings if available
    if (this.semanticMappingsGenerated) {
      for (const [term, entityTypes] of Object.entries(this.semanticMappingsCache)) {
        entityMappings[term] = entityTypes;
      }
    }
    // Note: Semantic mappings are now generated in trySimplePatternMatching before this is called

    // Remove duplicates from arrays
    for (const key in entityMappings) {
      entityMappings[key] = [...new Set(entityMappings[key])];
    }

    return entityMappings;
  }

  /**
   * Ensure semantic mappings are generated for the current ontology
   */
  private async ensureSemanticMappingsGenerated(): Promise<void> {
    if (this.semanticMappingsGenerated) {
      return;
    }

    const validEntityTypes = this.ontologyService.getAllEntityTypes();
    await this.generateSemanticMappingsWithLLM(validEntityTypes);
  }

    /**
   * Load semantic mappings from ontology config or generate with LLM as fallback
   */
  private async generateSemanticMappingsWithLLM(validEntityTypes: string[]): Promise<void> {
    try {
      logger.info('Loading semantic mappings from ontology config...');
      
      // First, try to load semantic mappings from ontology config
      const ontologyPrompts = await this.getOntologyPrompts();
      const configSemanticMappings = ontologyPrompts?.queryTranslation?.semanticMappings;
      
      if (configSemanticMappings && typeof configSemanticMappings === 'object') {
        logger.info('Found semantic mappings in ontology config:', Object.keys(configSemanticMappings));
        
        // Cache the config-based mappings
        for (const [commonTerm, entityTypes] of Object.entries(configSemanticMappings)) {
          if (Array.isArray(entityTypes)) {
            const validMappedTypes = entityTypes.filter((type: string) => 
              validEntityTypes.includes(type)
            );
            if (validMappedTypes.length > 0) {
              this.semanticMappingsCache[commonTerm.toLowerCase()] = validMappedTypes;
              logger.info(`Cached config mapping: "${commonTerm}" -> [${validMappedTypes.join(', ')}]`);
            }
          }
        }
        
        // Mark as generated so we use cache in future calls
        this.semanticMappingsGenerated = true;
        logger.info('Semantic mappings loaded from ontology config successfully');
        return;
      }
      
      // Fallback to LLM generation if no config mappings found
      logger.info('No config mappings found, falling back to LLM generation...');
      
      const entityDescriptions = validEntityTypes.map(entityType => {
        const altLabels = this.ontologyService.getAlternativeLabels(entityType);
        return `${entityType}${altLabels.length > 0 ? ` (also known as: ${altLabels.join(', ')})` : ''}`;
      }).join('\n');

      logger.info('Entity descriptions length:', entityDescriptions.length);
      logger.info('Sample entities:', validEntityTypes.slice(0, 5));

      // Get ontology-specific semantic prompt if available
      const baseSemanticPrompt = ontologyPrompts?.queryTranslation?.semanticPrompt || `
You are an expert at analyzing ontology entities and creating semantic mappings for natural language queries.

Given these ontology entities:
{entityDescriptions}

Your task is to identify common natural language terms that users might use to refer to groups of these entities, and map them to the appropriate entity types.

CRITICAL REQUIREMENTS:
1. You MUST include mappings for these essential terms if relevant entities exist:
   - "persons" and "people" → all person/agent related entities
   - "agents" → agent-related entities  
   - "companies" and "organizations" → business/organization entities
   - "contracts" → contract/agreement entities
   - "projects" → project/process related entities
   - "documents" → document related entities

2. Analyze the entity names and descriptions to identify semantic groupings
3. Consider alternative labels and common synonyms
4. Map plural forms (e.g., "persons", "people", "agents", "companies")
5. Be comprehensive - include all relevant entity types for each semantic category

For example:
- If entities include "Buyer", "Contractor", "Tenderer", "AgentInRole", map them to "persons", "people", "agents"
- If entities include "Organization", "Business", "Company", map them to "companies", "organizations"
- If entities include "Contract", "Agreement", "Deal", map them to "contracts"

Generate mappings in this JSON format:
{
  "common_term": ["entity_type1", "entity_type2"],
  "another_term": ["entity_type3", "entity_type4"]
}

Be thorough and include all relevant mappings. Users should be able to query using natural language terms.

Return only the JSON object, no other text.
`;

      const semanticPrompt = baseSemanticPrompt.replace(/{entityDescriptions}/g, entityDescriptions);

      logger.info('Sending request to OpenAI...');
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: semanticPrompt },
          { role: 'user', content: 'Generate semantic mappings for these entities.' }
        ],
        response_format: { type: 'json_object' },
      });

      const result = completion.choices[0]?.message?.content;
      logger.info('Received response from OpenAI, length:', result?.length);
      
      if (result) {
        const semanticMappings = JSON.parse(result);
        logger.info('Parsed semantic mappings:', Object.keys(semanticMappings));
        
        // Cache the LLM-generated mappings for future use
        for (const [commonTerm, entityTypes] of Object.entries(semanticMappings)) {
          if (Array.isArray(entityTypes)) {
            const validMappedTypes = entityTypes.filter((type: string) => 
              validEntityTypes.includes(type)
            );
            if (validMappedTypes.length > 0) {
              this.semanticMappingsCache[commonTerm.toLowerCase()] = validMappedTypes;
              logger.info(`Cached LLM mapping: "${commonTerm}" -> [${validMappedTypes.join(', ')}]`);
            }
          }
        }
        
        // Mark as generated so we use cache in future calls
        this.semanticMappingsGenerated = true;
        logger.info('Semantic mappings generation completed successfully');
      }
    } catch (error) {
      logger.warn('Failed to generate semantic mappings with LLM, continuing without them:', error);
      // Continue without semantic mappings if LLM fails
    }
  }
} 