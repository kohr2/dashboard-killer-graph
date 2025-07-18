import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { User } from '@platform/security/domain/user';
import { Conversation } from '@platform/chat/domain/conversation';
import { Message } from '@platform/chat/domain/message';
import { PermissionResource } from '@platform/security/domain/role';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { QueryTranslator } from './query-translator.service';
import type { ConversationTurn } from './query-translator.types';
import OpenAI from 'openai';
import { logger } from '@shared/utils/logger';

export interface ChatQuery {
  query: string;
  limit?: number;
  offset?: number;
  filters?: { [key: string]: string };
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ChatResponse {
  answer: string;
  data?: unknown[];
  metadata?: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    executionTime: number;
  };
}

@injectable()
export class ChatService {
  // In-memory store for conversations, for now. Replace with a real repository.
  private conversations: Map<string, Conversation> = new Map();
  // Simple history for the CLI context
  private queryHistory: ConversationTurn[] = [];
  private openai: OpenAI;
  private neo4j: Neo4jConnection;
  private ontologyService: OntologyService;
  private accessControlService: AccessControlService;
  private queryTranslator: QueryTranslator;

  constructor(
    neo4j: Neo4jConnection,
    ontologyService: OntologyService,
    accessControlService: AccessControlService,
    queryTranslator: QueryTranslator,
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

    this.neo4j = neo4j;
    this.ontologyService = ontologyService;
    this.accessControlService = accessControlService;
    this.queryTranslator = queryTranslator;

    // Seed with a sample conversation for testing
    const sampleConversation: Conversation = {
        id: 'conv-1',
        subject: 'Deal:deal-123',
        participants: ['analyst-1'],
        messages: [],
        createdAt: new Date(),
      };
    this.conversations.set(sampleConversation.id, sampleConversation);
  }

  private async getConversationById(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  public async sendMessage(
    user: User,
    conversationId: string,
    text: string,
  ): Promise<Message> {
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const subjectParts = conversation.subject.split(':');
    if (subjectParts.length !== 2) {
      throw new Error('Invalid conversation subject format');
    }
    const resourceType = subjectParts[0] as PermissionResource;

    const canAccess = this.accessControlService.can(user, 'read', resourceType);
    if (!canAccess) {
      throw new Error('Access denied to conversation subject');
    }

    const message: Message = {
      id: uuidv4(),
      text,
      userId: user.id,
      timestamp: new Date(),
      conversationId,
    };

    // Add message to conversation (in a real app, this would be persisted)
    conversation.messages.push(message);
    if (!conversation.participants.includes(user.id)) {
        conversation.participants.push(user.id);
    }

    return message;
  }

  public async getConversations(user: User): Promise<Conversation[]> {
    const allConversations = Array.from(this.conversations.values());
    const accessibleConversations: Conversation[] = [];

    for (const conversation of allConversations) {
      const subjectParts = conversation.subject.split(':');
      if (subjectParts.length !== 2) {
        // Skip invalid subjects
        continue;
      }
      const resourceType = subjectParts[0] as PermissionResource;

      if (this.accessControlService.can(user, 'read', resourceType)) {
        accessibleConversations.push(conversation);
      }
    }

    return accessibleConversations;
  }

  public async handleQuery(user: User, query: string): Promise<string> {
    logger.info(`[ChatService] Handling query: "${query}"`);
    
    const structuredQuery = await this.queryTranslator.translate(
      query,
      this.queryHistory,
    );

    logger.info(`[ChatService] Structured query result:`, JSON.stringify(structuredQuery, null, 2));

    let response: any;
    let responseText: string;
    let sourceEntityForResponse: any = null;

    switch (structuredQuery.command) {
      case 'show':
        response = await this.getAndFormatResources(user, structuredQuery.resourceTypes as PermissionResource[], structuredQuery.filters);
        responseText = this.formatResults(structuredQuery.resourceTypes, response);
        break;
      
      case 'show_related':
        if ((!structuredQuery.relatedTo || structuredQuery.relatedTo.length === 0) && !structuredQuery.filters) {
          responseText = "I'm sorry, I don't have a previous context to relate this query to.";
          response = responseText;
          break;
        }
        const sourceEntityName = structuredQuery.sourceEntityName;
        const relationshipType = structuredQuery.relationshipType;
        const relatedResult = await this.findRelatedResources(
            user, 
            structuredQuery.resourceTypes, 
            structuredQuery.relatedTo as PermissionResource[], 
            structuredQuery.filters,
            sourceEntityName, 
            relationshipType
        );

        if (relatedResult) {
            response = relatedResult.relatedResources;
            sourceEntityForResponse = relatedResult.sourceEntity;
            responseText = this.formatResults(structuredQuery.resourceTypes, response);
        } else {
            response = [];
            responseText = "Could not find the specified entity to find related resources for.";
        }
        break;

      default:
        responseText = "I'm sorry, I can only show resources or find related ones. Please ask me to 'show all [resource]' or something similar.";
        response = responseText;
        break;
    }
    
    // Save the turn to history
    this.queryHistory.push({
        userQuery: query,
        assistantResponse: response, // Store the raw objects for future queries
    });
    // Keep history short for now
    if (this.queryHistory.length > 5) {
        this.queryHistory.shift();
    }

    // NEW: Generate a natural language response
    try {
      const finalResponse = await this.generateNaturalResponse(query, response, sourceEntityForResponse);
      return finalResponse;
    } catch (error) {
      logger.error('Error generating natural response, falling back to simple format:', error);
      // Fallback to simple response formatting
      return responseText;
    }
  }

  private cleanRecord(record: any): any {
    if (!record) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding, ...rest } = record;
    return rest;
  }

  private async generateNaturalResponse(originalQuery: string, data: any, sourceEntity: any = null): Promise<string> {
    if (typeof data === 'string') {
        return data; // Return simple messages directly
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
        return "I couldn't find any information for your query.";
    }

    let systemPrompt = `You are a helpful assistant. Based ONLY on the provided structured data, answer the user's query in a clear and natural way.
Do not make up any information that is not in the data. If the data is empty, say that you couldn't find any information.
Summarize the results if they are numerous, but list key details. Format your answer nicely in markdown.`;

    if (sourceEntity) {
        const entityName = sourceEntity.name || sourceEntity.summary || 'the specified entity';
        systemPrompt += `\nThe user's query was about finding information related to '${entityName}'. The provided data is the result of that search. Frame your response accordingly, for example: 'Here are the organizations related to ${entityName}: ...'`;
    }

    let dataToSend = Array.isArray(data) ? data.map(this.cleanRecord) : this.cleanRecord(data);
    
    const MAX_RESULTS_TO_SEND = 20;
    if (Array.isArray(data) && data.length > MAX_RESULTS_TO_SEND) {
        dataToSend = data.slice(0, MAX_RESULTS_TO_SEND).map(this.cleanRecord);
        dataToSend.push({ __truncated: true, total: data.length });
    }

    const dataAsString = JSON.stringify(dataToSend, null, 2);

    try {
        logger.info('--- Sending to OpenAI for Final Response Generation ---');
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `My query was: "${originalQuery}". The data I found is: \n\n${dataAsString}` },
            ],
        });
        const result = completion.choices[0]?.message?.content;
        logger.info('--- Received Natural Language Response from OpenAI ---');

        if (!result) {
            return "I found some data, but I'm having trouble phrasing a response.";
        }
        return result;

    } catch (error) {
        logger.error('Error generating natural response with OpenAI:', error);
        return 'I encountered an error while formulating the final response.';
    }
  }

  private async getAndFormatResources(user: User, resourceTypes: PermissionResource[], filters?: { [key: string]: string }) {
    const allResults: unknown[] = [];
    for (const resourceType of resourceTypes) {
        if (!this.ontologyService.getAllEntityTypes().includes(resourceType)) {
            logger.warn(`Skipping unknown resource type '${resourceType}'`);
            continue;
        }
    
        if (!this.accessControlService.can(user, 'query', resourceType)) {
            logger.warn(`Access denied to query resource '${resourceType}'`);
            continue;
        }

        const session = this.neo4j.getSession();
        try {
            let whereClauses = '';
            const params: { [key: string]: any } = {};

            if (filters) {
                const clauses = Object.entries(filters).map(([key, value], index) => {
                    const paramName = `param${index}`;
                    params[paramName] = value;
                    return `n.\`${key}\` CONTAINS $${paramName}`;
                });
                if (clauses.length > 0) {
                    whereClauses = `WHERE ${clauses.join(' AND ')}`;
                }
            }

            // Simple query without problematic parameters
            const query = `
                MATCH (n:\`${resourceType}\`) ${whereClauses} 
                RETURN n 
                LIMIT 20
            `;
            logger.info(`Executing Cypher: ${query}`);

            const result = await session.run(query, params);
            const newRecords = result.records.map(r => this.cleanRecord({ ...r.get('n').properties, __type: resourceType }));
            allResults.push(...newRecords);
        } finally {
            await session.close();
        }
    }
    return allResults;
  }

  private async findRelatedResources(
    user: User,
    targetResourceTypes: string[],
    sourceResourceTypes: PermissionResource[],
    filters?: { [key: string]: string },
    sourceEntityName?: string,
    relationshipType?: string
  ): Promise<{ sourceEntity: any; relatedResources: any[] } | null> {
    if (targetResourceTypes.some(rt => !this.accessControlService.can(user, 'query', rt as PermissionResource))) {
        throw new Error(`Access denied to query one of the target resource types.`);
    }

    let sourceEntities: any[] = [];

    // Case 1: The query is self-contained and defines the source entity with filters (e.g., "orgs related to person named Rick")
    if (filters && Object.keys(filters).length > 0) {
        sourceEntities = await this.getAndFormatResources(user, sourceResourceTypes, filters);
    } 
    // Case 2: The query relates to the previous turn in the conversation
    else {
        const lastTurn = this.queryHistory.length > 0 ? this.queryHistory[this.queryHistory.length - 1] : null;
        if (lastTurn && lastTurn.assistantResponse && typeof lastTurn.assistantResponse !== 'string') {
            sourceEntities = lastTurn.assistantResponse as any[];
        }
    }
    
    if (sourceEntities.length === 0) {
        return null;
    }

    // If a specific entity name is provided (e.g., from a follow-up "what about 'Project Alpha'"), filter the source entities further
    if (sourceEntityName) {
        sourceEntities = sourceEntities.filter(e => e.name === sourceEntityName);
        if (sourceEntities.length === 0) {
            return null;
        }
    }
    
    // For now, let's assume the filter identifies a single source entity.
    const sourceEntity = sourceEntities[0];

    const sourceIds = [sourceEntity.id];
    if (sourceIds.length === 0) {
        return null;
    }

    const session = this.neo4j.getSession();
    try {
        const relationshipCypher = relationshipType ? `[:\`${relationshipType}\`]--()--[*0..1]` : `[*1..2]`;
        
        const sourceLabelsCypher = sourceResourceTypes.map(l => `\`${l}\``).join('|');
        const targetLabelsCypher = targetResourceTypes.map(l => `\`${l}\``).join('|');

        const cypherQuery = `
            MATCH (source:${sourceLabelsCypher})-${relationshipCypher}-(target:${targetLabelsCypher})
            WHERE source.id IN $sourceIds
            RETURN DISTINCT target
        `;
        
        logger.info(`Executing Cypher: ${cypherQuery.replace(/\s+/g, ' ').trim()}`);

        const result = await session.run(cypherQuery, { sourceIds });
        const records = result.records.map(record => record.get('target'));
        
        const relatedResources = records.map(node => this.cleanRecord({ ...node.properties, __type: node.labels[0] }));

        return { sourceEntity, relatedResources };

    } finally {
        await session.close();
    }
  }

  private formatResults(resourceTypes: string[], records: any[]): string {
    if (!records || records.length === 0) {
        return `No results found for '${resourceTypes.join(', ')}'.`;
    }

    if (typeof records === 'string') {
      return records;
    }

    let resultsText = '';

    // Group results by their type for clearer output
    const groupedResults: { [key: string]: any[] } = {};
    for (const record of records) {
        const type = record.__type || resourceTypes[0];
        if (!groupedResults[type]) {
            groupedResults[type] = [];
        }
        groupedResults[type].push(record);
    }

    for (const type in groupedResults) {
        resultsText += `Query Results for ${type}:\n\n`;
        const groupRecords = groupedResults[type];
        const keyProperties = this.ontologyService.getKeyProperties(type);

        resultsText += groupRecords.map((properties, index) => {
            let recordText = '';
    
            if (properties.name) {
                recordText += `Item ${index + 1}: ${properties.name}\n`;
            } else {
                recordText += `Item ${index + 1} (ID: ${properties.id})\n`;
            }
    
            if (keyProperties && keyProperties.length > 0) {
                // Show only key properties
                for (const key of keyProperties) {
                    const value = properties[key];
                    if (value !== null && value !== undefined && value !== '') {
                        recordText += `  - ${key}: ${value}\n`;
                    }
                }
            } else {
                // Fallback to showing all properties except noisy ones
                for (const [key, value] of Object.entries(properties)) {
                    if (key === 'embedding' || key === 'name' || key === 'id' || key === '__type') {
                        continue;
                    }
                    if (value === null || value === undefined || value === '') {
                        continue;
                    }
        
                    const displayValue = typeof value === 'string' && value.length > 100 ? `${value.substring(0, 97)}...` : value;
                    recordText += `  - ${key}: ${displayValue}\n`;
                }
            }
            return recordText;
        }).join('\n');
        resultsText += '\n\n';
    }


    return resultsText.trim();
  }

  async processQuery(user: User, chatQuery: ChatQuery): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // Parse the natural language query
      const { intent, entities, resourceTypes, filters } = await this.parseQuery(chatQuery.query);
      
      // Apply user filters and pagination
      const mergedFilters = { ...filters, ...chatQuery.filters };
      const limit = Math.min(chatQuery.limit || 20, 100); // Max 100 items
      const offset = chatQuery.offset || 0;
      
      // Get data with optimized pagination
      const results = await this.getAndFormatResourcesOptimized(
        user, 
        resourceTypes, 
        mergedFilters,
        {
          limit,
          offset,
          sortBy: chatQuery.sortBy || 'createdAt',
          sortOrder: chatQuery.sortOrder || 'DESC'
        }
      );
      
      // Generate response
      const answer = await this.generateResponse(intent, entities, results.data);
      
      const executionTime = Date.now() - startTime;
      
      return {
        answer,
        data: results.data,
        metadata: {
          total: results.total,
          page: Math.floor(offset / limit) + 1,
          pageSize: limit,
          hasMore: offset + limit < results.total,
          executionTime
        }
      };
      
    } catch (error) {
      logger.error('Chat query processing failed:', error);
      return {
        answer: "Je suis désolé, je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ?",
        metadata: {
          total: 0,
          page: 1,
          pageSize: 0,
          hasMore: false,
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  private async parseQuery(query: string): Promise<{
    intent: string;
    entities: string[];
    resourceTypes: PermissionResource[];
    filters: { [key: string]: string };
  }> {
    // Enhanced query parsing logic
    const intent = this.extractIntent(query);
    const entities = this.extractEntities(query);
    const resourceTypes = this.mapToResourceTypes(query);
    const filters = this.extractFilters(query);
    
    return { intent, entities, resourceTypes, filters };
  }

  private extractIntent(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('find')) {
      return 'list';
    } else if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
      return 'count';
    } else if (lowerQuery.includes('recent') || lowerQuery.includes('latest')) {
      return 'recent';
    } else if (lowerQuery.includes('search')) {
      return 'search';
    }
    
    return 'general';
  }

  private extractEntities(query: string): string[] {
    // Simple entity extraction - could be enhanced with NLP
    const entities: string[] = [];
    const words = query.toLowerCase().split(' ');
    
    // Look for common business entities
    const entityPatterns = {
      'contact': ['contact', 'person', 'people'],
      'organization': ['organization', 'company', 'firm'],
      'deal': ['deal', 'transaction', 'opportunity'],
      'communication': ['email', 'communication', 'message'],
      'task': ['task', 'todo', 'action']
    };
    
    for (const [entity, patterns] of Object.entries(entityPatterns)) {
      if (patterns.some(pattern => words.includes(pattern))) {
        entities.push(entity);
      }
    }
    
    return entities;
  }

  private mapToResourceTypes(query: string): PermissionResource[] {
    const lowerQuery = query.toLowerCase();
    const resourceTypes: PermissionResource[] = [];
    
    // Get all available labels (entity types + alternative labels)
    const allAvailableLabels = this.ontologyService.getAllAvailableLabels();
    
    // Create a mapping from alternative labels to actual entity types
    const labelToEntityType = new Map<string, string>();
    
    // Add direct entity types
    for (const entityType of this.ontologyService.getAllEntityTypes()) {
      labelToEntityType.set(entityType.toLowerCase(), entityType);
    }
    
    // Add alternative labels
    for (const entityType of this.ontologyService.getAllEntityTypes()) {
      const altLabels = this.ontologyService.getAlternativeLabels(entityType);
      for (const altLabel of altLabels) {
        labelToEntityType.set(altLabel.toLowerCase(), entityType);
      }
    }
    
    // Check for matches in the query
    for (const [label, entityType] of labelToEntityType) {
      if (lowerQuery.includes(label)) {
        if (!resourceTypes.includes(entityType as PermissionResource)) {
          resourceTypes.push(entityType as PermissionResource);
        }
      }
    }
    
    // Fallback to common patterns if no specific matches found
    if (resourceTypes.length === 0) {
      if (lowerQuery.includes('contact') || lowerQuery.includes('person')) {
        resourceTypes.push('Contact');
      }
      if (lowerQuery.includes('organization') || lowerQuery.includes('company')) {
        resourceTypes.push('Organization');
      }
      if (lowerQuery.includes('deal') || lowerQuery.includes('project')) {
        resourceTypes.push('Deal');
      }
      if (lowerQuery.includes('email') || lowerQuery.includes('communication')) {
        resourceTypes.push('Communication');
      }
      if (lowerQuery.includes('task')) {
        resourceTypes.push('Task');
      }
    }
    
    // Default to common entities if none specified
    if (resourceTypes.length === 0) {
      resourceTypes.push('Contact', 'Organization', 'Deal');
    }
    
    return resourceTypes;
  }

  /**
   * Resolves a resource type from a label (entity type or alternative label)
   * @param label The label to resolve
   * @returns The resolved entity type, or null if not found
   */
  private resolveResourceTypeFromLabel(label: string): string | null {
    // First check if it's a direct entity type
    if (this.ontologyService.getAllEntityTypes().includes(label)) {
      return label;
    }
    
    // Then check alternative labels
    return this.ontologyService.resolveEntityTypeFromAlternativeLabel(label);
  }

  private extractFilters(query: string): { [key: string]: string } {
    const filters: { [key: string]: string } = {};
    
    // Extract date filters
    if (query.includes('today')) {
      filters.dateFilter = 'today';
    } else if (query.includes('this week')) {
      filters.dateFilter = 'week';
    } else if (query.includes('this month')) {
      filters.dateFilter = 'month';
    }
    
    // Extract status filters
    if (query.includes('active')) {
      filters.status = 'active';
    } else if (query.includes('completed')) {
      filters.status = 'completed';
    }
    
    return filters;
  }

  private async getAndFormatResourcesOptimized(
    user: User, 
    resourceTypes: PermissionResource[], 
    filters?: { [key: string]: string },
    pagination?: {
      limit: number;
      offset: number;
      sortBy: string;
      sortOrder: 'ASC' | 'DESC';
    }
  ): Promise<{ data: unknown[]; total: number }> {
    
    const allResults: unknown[] = [];
    let totalCount = 0;
    
    for (const resourceType of resourceTypes) {
      if (!this.ontologyService.getAllEntityTypes().includes(resourceType)) {
        logger.warn(`Skipping unknown resource type '${resourceType}'`);
        continue;
      }
      
      if (!this.accessControlService.can(user, 'query', resourceType)) {
        logger.warn(`Access denied to query resource '${resourceType}'`);
        continue;
      }

      const session = this.neo4j.getSession();
      try {
        // Build optimized query with proper indexing
        const { whereClause, params } = this.buildWhereClause(filters);
        const { orderClause, limitClause } = this.buildPaginationClause(pagination);
        
        // Count query for total
        const countQuery = `
          MATCH (n:\`${resourceType}\`) 
          ${whereClause}
          RETURN count(n) as total
        `;
        
        const countResult = await session.run(countQuery, params);
        const typeTotal = countResult.records[0]?.get('total').toNumber() || 0;
        totalCount += typeTotal;
        
        // Data query with pagination
        const dataQuery = `
          MATCH (n:\`${resourceType}\`) 
          ${whereClause}
          RETURN n
          ${orderClause}
          ${limitClause}
        `;
        
        logger.info(`Executing optimized query: ${dataQuery}`);
        
        const dataResult = await session.run(dataQuery, {
          ...params,
          skip: pagination?.offset || 0,
          limit: pagination?.limit || 20
        });
        
        const records = dataResult.records.map(r => 
          this.cleanRecord({ 
            ...r.get('n').properties, 
            __type: resourceType 
          })
        );
        
        allResults.push(...records);
        
      } catch (error) {
        logger.error(`Query failed for ${resourceType}:`, error);
      } finally {
        await session.close();
      }
    }
    
    return { data: allResults, total: totalCount };
  }

  private buildWhereClause(filters?: { [key: string]: string }): { 
    whereClause: string; 
    params: { [key: string]: any } 
  } {
    if (!filters || Object.keys(filters).length === 0) {
      return { whereClause: '', params: {} };
    }
    
    const clauses: string[] = [];
    const params: { [key: string]: any } = {};
    
    Object.entries(filters).forEach(([key, value], index) => {
      if (key === 'dateFilter') {
        // Handle date filters
        const paramName = `dateParam${index}`;
        switch (value) {
          case 'today':
            clauses.push(`n.createdAt >= datetime() - duration({days: 1})`);
            break;
          case 'week':
            clauses.push(`n.createdAt >= datetime() - duration({days: 7})`);
            break;
          case 'month':
            clauses.push(`n.createdAt >= datetime() - duration({days: 30})`);
            break;
        }
      } else {
        // Handle property filters
        const paramName = `param${index}`;
        params[paramName] = value;
        clauses.push(`toLower(toString(n.\`${key}\`)) CONTAINS toLower($${paramName})`);
      }
    });
    
    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return { whereClause, params };
  }

  private buildPaginationClause(pagination?: {
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }): { orderClause: string; limitClause: string } {
    
    if (!pagination) {
      return { orderClause: '', limitClause: 'LIMIT 20' };
    }
    
    const orderClause = `ORDER BY n.${pagination.sortBy} ${pagination.sortOrder}`;
    const limitClause = `SKIP $skip LIMIT $limit`;
    
    return { orderClause, limitClause };
  }

  private async generateResponse(intent: string, entities: string[], data: any[]): Promise<string> {
    const count = data.length;
    
    if (count === 0) {
      return "Je n'ai trouvé aucun résultat correspondant à votre recherche.";
    }
    
    switch (intent) {
      case 'count':
        return `J'ai trouvé ${count} élément(s) correspondant à votre recherche.`;
      
      case 'list':
        const entityTypes = [...new Set(data.map(item => item.__type))];
        return `J'ai trouvé ${count} résultat(s) incluant ${entityTypes.join(', ')}.`;
      
      case 'recent':
        return `Voici les ${count} éléments les plus récents que j'ai trouvés.`;
      
      case 'find_deals':
        if (data.length > 0) {
          const entityTypes = [...new Set(data.map(item => item.__type))];
          if (entityTypes.includes('Deal')) {
            const dealNames = data.filter(d => d.__type === 'Deal').map(d => d.name).join(', ');
            return `I found the following deals: ${dealNames}.`;
          }
        }
        return "I couldn't find any deals matching your query.";
      
      default:
        return `J'ai trouvé ${count} résultat(s) pour votre recherche.`;
    }
  }
} 