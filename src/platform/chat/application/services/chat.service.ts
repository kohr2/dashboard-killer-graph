import { singleton } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { User } from '@platform/security/domain/user';
import { Conversation } from '@platform/chat/domain/conversation';
import { Message } from '@platform/chat/domain/message';
import { PermissionResource } from '@platform/security/domain/role';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { QueryTranslator, ConversationTurn } from './query-translator.service';
import OpenAI from 'openai';

@singleton()
export class ChatService {
  // In-memory store for conversations, for now. Replace with a real repository.
  private conversations: Map<string, Conversation> = new Map();
  // Simple history for the CLI context
  private queryHistory: ConversationTurn[] = [];
  private openai: OpenAI;

  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly ontologyService: OntologyService,
    private readonly neo4j: Neo4jConnection,
    private readonly queryTranslator: QueryTranslator,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
    const structuredQuery = await this.queryTranslator.translate(
      query,
      this.queryHistory,
    );

    let response: any;
    let responseText: string;

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
        response = await this.findRelatedResources(
            user, 
            structuredQuery.resourceTypes, 
            structuredQuery.relatedTo as PermissionResource[], 
            structuredQuery.filters,
            sourceEntityName, 
            relationshipType
        );
        responseText = this.formatResults(structuredQuery.resourceTypes, response);
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
    const finalResponse = await this.generateNaturalResponse(query, response);

    return finalResponse;
  }

  private cleanRecord(record: any): any {
    if (!record) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding, ...rest } = record;
    return rest;
  }

  private async generateNaturalResponse(originalQuery: string, data: any): Promise<string> {
    if (typeof data === 'string') {
        return data; // Return simple messages directly
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
        return "I couldn't find any information for your query.";
    }

    const systemPrompt = `You are a helpful assistant. Based ONLY on the provided structured data, answer the user's query in a clear and natural way.
Do not make up any information that is not in the data. If the data is empty, say that you couldn't find any information.
Summarize the results if they are numerous, but list key details. Format your answer nicely in markdown.
If you see a special marker like '{"__truncated__": true, "total": X}', it means the list of results is not complete. You should mention this in your response (e.g., "Here are the first 20 of X total results...").`;

    let dataToSend = data;
    const MAX_RESULTS_TO_SEND = 20;
    if (Array.isArray(data) && data.length > MAX_RESULTS_TO_SEND) {
        dataToSend = data.slice(0, MAX_RESULTS_TO_SEND);
        dataToSend.push({ __truncated: true, total: data.length });
    }

    const dataAsString = JSON.stringify(dataToSend, null, 2);

    try {
        console.log('--- Sending to OpenAI for Final Response Generation ---');
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `My query was: "${originalQuery}". The data I found is: \n\n${dataAsString}` },
            ],
        });
        const result = completion.choices[0]?.message?.content;
        console.log('--- Received Natural Language Response from OpenAI ---');

        if (!result) {
            return "I found some data, but I'm having trouble phrasing a response.";
        }
        return result;

    } catch (error) {
        console.error('Error generating natural response with OpenAI:', error);
        return 'I encountered an error while formulating the final response.';
    }
  }

  private async getAndFormatResources(user: User, resourceTypes: PermissionResource[], filters?: { [key: string]: string }) {
    const allResults: any[] = [];
    for (const resourceType of resourceTypes) {
        if (!this.ontologyService.getAllEntityTypes().includes(resourceType)) {
            console.warn(`Skipping unknown resource type '${resourceType}'`);
            continue;
        }
    
        if (!this.accessControlService.can(user, 'query', resourceType)) {
            console.warn(`Access denied to query resource '${resourceType}'`);
            continue;
        }

        const session = this.neo4j.getDriver().session();
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

            const query = `MATCH (n:\`${resourceType}\`) ${whereClauses} RETURN n LIMIT 20`;
            console.log(`Executing Cypher: ${query}`);

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
  ): Promise<any[]> {
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
        return [];
    }

    // If a specific entity name is provided (e.g., from a follow-up "what about 'Project Alpha'"), filter the source entities further
    if (sourceEntityName) {
        sourceEntities = sourceEntities.filter(e => e.name === sourceEntityName);
        if (sourceEntities.length === 0) {
            return [];
        }
    }

    const sourceIds = sourceEntities.map(e => e.id);
    if (sourceIds.length === 0) {
        return [];
    }

    const session = this.neo4j.getDriver().session();
    try {
        const relationshipCypher = relationshipType ? `[:\`${relationshipType}\`]` : `[*1..2]`;
        
        const sourceLabelsCypher = sourceResourceTypes.map(l => `\`${l}\``).join('|');
        const targetLabelsCypher = targetResourceTypes.map(l => `\`${l}\``).join('|');

        const cypherQuery = `
            MATCH (source:${sourceLabelsCypher})-${relationshipCypher}-(target:${targetLabelsCypher})
            WHERE source.id IN $sourceIds
            RETURN DISTINCT target
        `;
        
        console.log(`Executing Cypher: ${cypherQuery.replace(/\s+/g, ' ').trim()}`);

        const result = await session.run(cypherQuery, { sourceIds });
        const records = result.records.map(record => record.get('target'));
        
        return records.map(node => this.cleanRecord({ ...node.properties, __type: node.labels[0] }));

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
} 