#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Debugging MCP Server...');

// Simuler une session Claude Desktop
const mcpProcess = spawn('npx', [
  'ts-node', 
  '-r', 
  'tsconfig-paths/register', 
  path.join(__dirname, 'src/mcp-server-robust.ts')
], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let hasInitialized = false;
let initTimeout;

// Capturer les logs de démarrage
mcpProcess.stderr.on('data', (data) => {
  const message = data.toString();
  console.log('📝 STDERR:', message.trim());
  
  if (message.includes('🚀 Robust MCP Server running')) {
    hasInitialized = true;
    console.log('✅ Server initialized successfully');
    
    // Tester une requête après initialisation
    setTimeout(() => {
      testQuery();
    }, 1000);
  }
});

mcpProcess.stdout.on('data', (data) => {
  const message = data.toString();
  console.log('📤 STDOUT:', message.trim());
});

mcpProcess.on('error', (error) => {
  console.error('💥 Process Error:', error);
});

mcpProcess.on('exit', (code, signal) => {
  console.log(`🔚 Process exited with code ${code}, signal ${signal}`);
  if (!hasInitialized) {
    console.error('❌ Server failed to initialize');
  }
});

// Timeout de 10 secondes pour l'initialisation
initTimeout = setTimeout(() => {
  if (!hasInitialized) {
    console.error('⏰ Initialization timeout');
    mcpProcess.kill();
  }
}, 10000);

function testQuery() {
  console.log('🔧 Testing query...');
  
  const testRequest = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "query",
      arguments: {
        query: "Show recent deals with Blackstone"
      }
    },
    id: "test-1"
  };
  
  mcpProcess.stdin.write(JSON.stringify(testRequest) + '\n');
  
  // Attendre la réponse puis tester help
  setTimeout(() => {
    testHelp();
  }, 2000);
}

function testHelp() {
  console.log('🔧 Testing help...');
  
  const helpRequest = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "help",
      arguments: {
        topic: "status"
      }
    },
    id: "test-2"
  };
  
  mcpProcess.stdin.write(JSON.stringify(helpRequest) + '\n');
  
  // Arrêter après 5 secondes
  setTimeout(() => {
    console.log('✅ Tests completed, stopping server...');
    mcpProcess.kill();
  }, 3000);
}

// Gérer l'arrêt propre
process.on('SIGINT', () => {
  console.log('🛑 Stopping debug session...');
  mcpProcess.kill();
  process.exit(0);
}); 