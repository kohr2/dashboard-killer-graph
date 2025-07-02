export interface StructuredQuery {
  command: string;
  resourceTypes: string[];
  filters?: Record<string, any>;
  relatedTo?: string[];
  sourceEntityName?: string;
  relationshipType?: string;
}

export interface ConversationTurn {
  userQuery: string;
  assistantResponse: unknown;
} 