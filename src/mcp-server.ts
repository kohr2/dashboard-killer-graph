import 'reflect-metadata';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { z } from 'zod';
import './register-ontologies'; // Ensure all services are registered

const CHAT_API_URL = process.env.CHAT_API_URL || 'http://localhost:3001/api/chat/query';

// Create a new MCP server
const server = new Server(
  {
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
            // The MCP server calls the main API server
            const response = await axios.post(CHAT_API_URL, { query });

            const apiResponse = response.data.response;
            console.log(`MCP Tool: Received API response: \"${apiResponse}\"`);

            return { content: [{ type: 'text', text: apiResponse }] };
          } catch (error: any) {
            console.error('MCP Tool: Error calling Chat API:', JSON.stringify(error, null, 2));
            let errorMessage = 'Failed to query platform.';
            if (axios.isAxiosError(error)) {
              errorMessage = error.message;
            }
            return { isError: true, content: [{ type: 'text', text: `Failed to query platform: ${errorMessage}` }] };
          }
        },
      },
    ],
  },
);

// Start the server with a transport
async function startServer() {
  console.log('Starting MCP server...');
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('✅ MCP server is running and connected to stdio transport.');
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

startServer(); 