import 'reflect-metadata';
import './register-ontologies'; // Ensure all services are registered
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { serverConfig } from './mcp-server.config';

// Create a new MCP server
const server = new Server(serverConfig);

// Connect the server to a transport
async function start() {
    console.log('Starting MCP server with stdio transport...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('✅ MCP server connected to stdio.');
}

start(); 