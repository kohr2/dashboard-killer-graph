#!/usr/bin/env node

// Simple test to verify MCP server protocol communication
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing MCP Protocol Communication');
console.log('=====================================');

// Start the MCP server
const mcpServer = spawn('node', ['src/mcp/servers/mcp-server-stdio.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NEO4J_DATABASE: 'dashboard-killer',
    MCP_ACTIVE_ONTOLOGIES: 'core,fibo',
    LOG_SILENT: 'true'
  }
});

let serverOutput = '';
let serverError = '';

mcpServer.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log('📤 Server stdout:', output.trim());
});

mcpServer.stderr.on('data', (data) => {
  const error = data.toString();
  serverError += error;
  console.log('⚠️  Server stderr:', error.trim());
});

mcpServer.on('close', (code) => {
  console.log(`\n🛑 Server exited with code ${code}`);
  console.log('📋 Full server output:', serverOutput);
  console.log('❌ Server errors:', serverError);
});

// Wait a moment for server to start
setTimeout(() => {
  console.log('\n📡 Sending MCP initialization message...');
  
  // Send MCP initialization message
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  mcpServer.stdin.write(JSON.stringify(initMessage) + '\n');
  
  // Wait and send list tools request
  setTimeout(() => {
    console.log('📡 Sending list tools request...');
    
    const listToolsMessage = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    };
    
    mcpServer.stdin.write(JSON.stringify(listToolsMessage) + '\n');
    
    // Wait and then close
    setTimeout(() => {
      console.log('📡 Closing connection...');
      mcpServer.stdin.end();
    }, 2000);
    
  }, 1000);
  
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Terminating test...');
  mcpServer.kill();
  process.exit(0);
}); 