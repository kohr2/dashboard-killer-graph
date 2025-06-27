import 'reflect-metadata';
import axios from 'axios';
import { z } from 'zod';

const CHAT_API_URL = process.env.CHAT_API_URL || 'http://localhost:3001/api/chat/query';

export const serverConfig = {
  name: 'knowledge-platform-query-agent',
  version: '1.0.0',
  tools: [
    {
      name: 'query',
      description: 'Queries the knowledge platform with a natural language question and returns the answer.',
      arguments: z.object({
        query: z.string().describe('The natural language query to ask the platform.'),
      }),
      handler: async ({ query }: { query: string }) => {
        console.log(`MCP Tool: Received query: \"${query}\"`);
        try {
          const response = await axios.post(CHAT_API_URL, { query });
          const apiResponse = response.data.response;
          console.log(`MCP Tool: Received API response: \"${apiResponse}\"`);
          return { content: [{ type: 'text', text: apiResponse }] };
        } catch (error: any) {
          console.error('MCP Tool: Error calling Chat API:', error.message);
          return { isError: true, content: [{ type: 'text', text: `Failed to query platform: ${error.message}` }] };
        }
      },
    },
  ],
}; 