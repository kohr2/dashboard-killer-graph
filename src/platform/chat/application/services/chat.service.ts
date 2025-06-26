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

@singleton()
export class ChatService {
  // In-memory store for conversations, for now. Replace with a real repository.
  private conversations: Map<string, Conversation> = new Map();
  // Simple history for the CLI context
  private queryHistory: ConversationTurn[] = [];

  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly ontologyService: OntologyService,
    private readonly neo4j: Neo4jConnection,
    private readonly queryTranslator: QueryTranslator,
  ) {
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
        response = await this.getAndFormatResources(user, structuredQuery.resourceType as PermissionResource);
        responseText = this.formatResults(structuredQuery.resourceType, response);
        break;
      
      case 'show_related':
        if (!structuredQuery.relatedTo || this.queryHistory.length === 0) {
          responseText = "I'm sorry, I don't have a previous context to relate this query to.";
          response = responseText;
          break;
        }
        const sourceEntityName = structuredQuery.sourceEntityName;
        response = await this.findRelatedResources(user, structuredQuery.resourceType, structuredQuery.relatedTo, sourceEntityName);
        responseText = this.formatResults(structuredQuery.resourceType, response);
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

    return responseText;
  }

  private async getAndFormatResources(user: User, resourceType: PermissionResource) {
    if (!this.ontologyService.getAllEntityTypes().includes(resourceType)) {
      throw new Error(`Unknown resource type '${resourceType}'`);
    }

    if (!this.accessControlService.can(user, 'query', resourceType)) {
      throw new Error(`Access denied to query resource '${resourceType}'`);
    }

    const session = this.neo4j.getDriver().session();
    try {
      const result = await session.run(`MATCH (n:${resourceType}) RETURN n LIMIT 20`);
      return result.records.map(r => r.get('n').properties);
    } finally {
      await session.close();
    }
  }

  private async findRelatedResources(
    user: User,
    targetResourceType: string,
    sourceResourceType: string,
    sourceEntityName?: string
  ): Promise<any[]> {
    if (!this.accessControlService.can(user, 'query', targetResourceType as PermissionResource)) {
        throw new Error(`Access denied to query resource '${targetResourceType}'`);
    }

    const lastTurn = this.queryHistory[this.queryHistory.length - 1];
    let sourceEntities = lastTurn.assistantResponse as any[];

    if (!sourceEntities || sourceEntities.length === 0 || typeof sourceEntities === 'string') {
        return [];
    }

    // If a specific entity name is provided, filter the source entities
    if (sourceEntityName) {
        sourceEntities = sourceEntities.filter(e => e.name === sourceEntityName);
        if (sourceEntities.length === 0) {
            // The specific entity from the user's query was not in the last turn's results.
            return [];
        }
    }

    const sourceIds = sourceEntities.map(e => e.id);

    const session = this.neo4j.getDriver().session();
    try {
        // We look for direct relationships first (1-hop) for precision.
        // A more advanced version could use the ontology to find multi-hop paths.
        const cypherQuery = `
            MATCH (source:${sourceResourceType})--(target:${targetResourceType})
            WHERE source.id IN $sourceIds
            RETURN DISTINCT target
        `;
        
        const result = await session.run(cypherQuery, { sourceIds });
        return result.records.map(record => record.get('target').properties);

    } finally {
        await session.close();
    }
  }

  private formatResults(resourceType: string, records: any[]): string {
    if (!records || records.length === 0) {
        return `No results found for '${resourceType}'.`;
    }

    if (typeof records === 'string') {
      return records;
    }

    const keyProperties = this.ontologyService.getKeyProperties(resourceType);

    const resultsText = records.map((properties, index) => {
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
                if (key === 'embedding' || key === 'name' || key === 'id') {
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

    return `Query Results for ${resourceType}:\n\n${resultsText}`;
  }
} 