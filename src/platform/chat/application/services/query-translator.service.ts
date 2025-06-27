import { singleton } from 'tsyringe';
import OpenAI from 'openai';
import { OntologyService } from '../../../ontology/ontology.service';

interface StructuredQuery {
  command: 'show' | 'unknown' | 'show_related';
  resourceTypes: string[];
  filters?: { [key: string]: string };
  relatedTo?: string[]; // The resource types from the previous context
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
2. 'show_related': For listing resources related to the entities from the previous turn in the conversation, or for complex self-contained relational queries.
3. 'unknown': For anything else (greetings, general questions, etc.).

The supported resource types are: ${validEntityTypes}.
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
- Assistant: {"command": "show", "resourceTypes": ["Person"], "filters": {"name": "Lisa"}}

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
- Assistant: {"command": "show_related", "resourceTypes": ["Person", "Contact"], "relatedTo": ["Deal"], "sourceEntityName": "Project Alpha", "relationshipType": "WORKS_ON"}

## Vague follow-up query
- (After getting a list of Deals) User: "what about the people?"
- Assistant: {"command": "show_related", "resourceTypes": ["Person", "Contact"], "relatedTo": ["Deal"]}

## Unrelated follow-up
- (After getting a list of Deals) User: "show all organizations"
- Assistant: {"command": "show", "resourceTypes": ["Organization"]}

## Vague follow-up
- (After getting a list of Deals) User: "and what else?"
- Assistant: {"command": "unknown", "resourceTypes": []}
`;

    try {
      console.log('--- Sending to OpenAI ---');
      console.log('User Query:', rawQuery);
      console.log('System Prompt:', systemPrompt);
      console.log('-------------------------');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawQuery },
        ],
        response_format: { type: 'json_object' },
      });

      const result = completion.choices[0]?.message?.content;

      console.log('--- Received from OpenAI ---');
      console.log('Raw Response:', result);
      console.log('----------------------------');

      if (!result) {
        throw new Error('OpenAI returned an empty response.');
      }

      const parsedResult: StructuredQuery = JSON.parse(result);

      // Basic validation
      if (parsedResult.command === 'show' && (!parsedResult.resourceTypes || parsedResult.resourceTypes.some(rt => !validEntityTypes.includes(rt)))) {
        return { command: 'unknown', resourceTypes: [] };
      }
      
      return parsedResult;

    } catch (error) {
      console.error('Error translating query with OpenAI:', error);
      // Fallback to a safe default in case of any API or parsing error
      return { command: 'unknown', resourceTypes: [] };
    }
  }
} 