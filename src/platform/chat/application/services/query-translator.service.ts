import { singleton } from 'tsyringe';
import OpenAI from 'openai';
import { OntologyService } from '@platform/ontology/ontology.service';

interface StructuredQuery {
  command: 'show' | 'unknown' | 'show_related';
  resourceType: string;
  relatedTo?: string; // The resource type from the previous context
  sourceEntityName?: string; // The specific entity name from the user's query
  relationshipType?: string; // The specific relationship to look for
}

export interface ConversationTurn {
    userQuery: string;
    assistantResponse: any; // Could be a string or a list of entities
}

@singleton()
export class QueryTranslator {
  private openai: OpenAI;

  constructor(private readonly ontologyService: OntologyService) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async translate(
    rawQuery: string,
    history: ConversationTurn[] = []
  ): Promise<StructuredQuery> {
    const validEntityTypes = this.ontologyService.getAllEntityTypes().join(', ');
    const lastTurn = history.length > 0 ? history[history.length - 1] : null;

    let previousContext = 'No previous context.';
    if (lastTurn) {
        // Simple stringification for now. We can make this more robust.
        const previousResult = JSON.stringify(lastTurn.assistantResponse, null, 2);
        previousContext = `The user just asked: "${lastTurn.userQuery}"\nAnd the assistant returned these entities: ${previousResult}`;
    }

    const schemaDescription = this.ontologyService.getSchemaRepresentation();

    const systemPrompt = `
You are an expert at translating natural language queries into a structured JSON format.
Your task is to identify the user's intent and the target resource, considering the conversational history and the graph schema.

You have three commands:
1. 'show': For listing all resources of a certain type.
2. 'show_related': For listing resources related to the entities from the previous turn in the conversation.
3. 'unknown': For anything else (greetings, general questions, etc.).

The supported resource types are: ${validEntityTypes}.
The user can write in any language.

# Rules:
- If the query is a stand-alone request (e.g., "show all deals"), use the 'show' command.
- If the query refers to a previous result (e.g., "which contacts are related to them?", "show their contacts"), use the 'show_related' command. You MUST set 'resourceType' to the type of entity the user is asking for now, and 'relatedTo' to the type of entity from the previous context.
- For 'show_related', if you can't determine the new resourceType, classify the command as 'unknown'.
- If the query is general (e.g., "show their contacts"), use 'show_related'.
- If the query refers to a *specific entity* from the history (e.g., "who is related to 'Project Alpha'"), you MUST also extract the 'sourceEntityName'.
- When using 'show_related', you should also try to infer the 'relationshipType' from the query and the schema. For example, "who works on" implies a relationship like 'WORKS_FOR'. If the relationship is ambiguous, omit 'relationshipType'.
- If there's no history or the query doesn't relate to it, treat it as a new query.

# Graph Schema
This is the structure of the knowledge graph you are querying:
${schemaDescription}

# Conversation History
${previousContext}

# Output Format
Provide the output in JSON format: {"command": "...", "resourceType": "...", "relatedTo": "...", "sourceEntityName": "...", "relationshipType": "..."}.
'relatedTo' is required for the 'show_related' command. 'sourceEntityName' and 'relationshipType' are optional.

# Examples:
## Stand-alone query
- User: "list all deals"
- Assistant: {"command": "show", "resourceType": "Deal"}

## General follow-up query
- (After getting a list of Deals) User: "show me the contacts for them"
- Assistant: {"command": "show_related", "resourceType": "Contact", "relatedTo": "Deal"}

## Specific follow-up query with relationship
- (After getting a list of Deals, one of which is 'Project Alpha') User: "who works on Project Alpha?"
- Assistant: {"command": "show_related", "resourceType": "Person", "relatedTo": "Deal", "sourceEntityName": "Project Alpha", "relationshipType": "WORKS_FOR"}

## Unrelated follow-up
- (After getting a list of Deals) User: "show all organizations"
- Assistant: {"command": "show", "resourceType": "Organization"}

## Vague follow-up
- (After getting a list of Deals) User: "and what else?"
- Assistant: {"command": "unknown", "resourceType": "none"}
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawQuery },
        ],
        response_format: { type: 'json_object' },
      });

      const result = completion.choices[0]?.message?.content;

      if (!result) {
        throw new Error('OpenAI returned an empty response.');
      }

      const parsedResult: StructuredQuery = JSON.parse(result);

      // Basic validation
      if (parsedResult.command === 'show' && !validEntityTypes.includes(parsedResult.resourceType)) {
        return { command: 'unknown', resourceType: 'none' };
      }
      
      return parsedResult;

    } catch (error) {
      console.error('Error translating query with OpenAI:', error);
      // Fallback to a safe default in case of any API or parsing error
      return { command: 'unknown', resourceType: 'none' };
    }
  }
} 