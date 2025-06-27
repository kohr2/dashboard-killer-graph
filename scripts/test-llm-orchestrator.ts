import 'reflect-metadata';
import { spawn } from 'child_process';
import { McpClient } from '@mcp/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI();

async function queryKnowledgePlatform(query: string): Promise<string> {
  console.log(`[Orchestrator] Déclenchement de l'outil pour la question : "${query}"`);

  const mcpProcess = spawn('ts-node', ['src/mcp-server.ts'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const client = new McpClient(mcpProcess);

  try {
    const result = await client.invoke('query', { query });

    if (result.isError || !result.content || result.content[0]?.type !== 'text') {
      console.error('[Orchestrator] Réponse invalide du serveur MCP:', result);
      return `Erreur: Réponse invalide reçue de la plateforme.`;
    }
    
    const responseText = result.content[0].text;
    console.log(`[Orchestrator] Réponse de l'outil: "${responseText}"`);
    return responseText;

  } catch (error) {
    console.error(`[Orchestrator] Erreur lors de l'invocation MCP:`, error);
    return `Erreur: La communication avec la plateforme a échoué.`;
  } finally {
    client.dispose();
  }
}

const availableTools: { [key: string]: Function } = {
  queryKnowledgePlatform: queryKnowledgePlatform,
};

async function main() {
  const userQuestion = "What is the status of the new deal for audax?";

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: userQuestion,
    },
  ];

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'queryKnowledgePlatform',
        description: 'Queries the internal knowledge platform to get information about deals, contacts, organizations, and communications.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The specific question to ask the knowledge platform. For example, "what is the status of deal X?" or "who is the contact for company Y?"',
            },
          },
          required: ['query'],
        },
      },
    },
  ];

  console.log(`[Main] Envoi de la question initiale à l'LLM: "${userQuestion}"`);

  let response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
    tools: tools,
    tool_choice: 'auto',
  });

  const responseMessage = response.choices[0].message;
  const toolCalls = responseMessage.tool_calls;

  if (toolCalls) {
    console.log('[Main] L\'LLM a décidé d\'utiliser un outil.');
    messages.push(responseMessage);

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionToCall = availableTools[functionName];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      console.log(`[Main] Appel de la fonction: ${functionName} avec les arguments:`, functionArgs);
      
      const functionResponse = await functionToCall(functionArgs.query);
      
      messages.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: functionResponse,
      });
    }

    console.log('[Main] Envoi des résultats de l\'outil à l\'LLM pour la réponse finale.');
    
    const secondResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
    });
    
    console.log("\n--- Réponse finale de l'LLM ---");
    console.log(secondResponse.choices[0].message.content);

  } else {
    console.log("\n--- Réponse finale de l'LLM (sans outil) ---");
    console.log(responseMessage.content);
  }
}

main().catch(console.error); 