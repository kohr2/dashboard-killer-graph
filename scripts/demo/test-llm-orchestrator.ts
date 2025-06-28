import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';

async function main() {
  console.log('Starting LLM orchestrator test...');

  // The command to execute the MCP server.
  // We use 'npx' to ensure it uses the local ts-node and tsconfig-paths.
  const transport = new StdioClientTransport({
    command: "npx",
    args: [
      "ts-node",
      "-r",
      "tsconfig-paths/register",
      "src/mcp-server.ts"
    ]
  });

  // Create a new MCP client instance
  const client = new Client({
    name: "test-orchestrator-client",
    version: "1.0.0",
  });

  try {
    // Connect the client to the server via the transport
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('✅ MCP client connected to server.');

    const userQuestion = "What is the status of the new deal for audax?";
    
    // Invoke the 'query' tool on the server
    console.log(`Invoking 'query' tool with question: "${userQuestion}"`);
    const result = await client.callTool({
      name: 'query',
      arguments: { query: userQuestion },
    });
    
    console.log('\\n--- Final Result from MCP Server ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('------------------------------------');

  } catch (error) {
    console.error('An error occurred during the test:', error);
  } finally {
    // Disconnect the client (this also terminates the transport and child process)
    console.log('\\nClosing transport...');
    await transport.close();
    console.log('Test complete. Transport closed.');
  }
}

main().catch(console.error); 