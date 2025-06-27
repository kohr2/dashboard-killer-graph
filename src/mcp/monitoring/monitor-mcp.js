#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Monitoring MCP Server connections...');

// Créer un fichier de log
const logFile = path.join(__dirname, 'mcp-monitor.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// Fonction pour démarrer le serveur avec surveillance
function startServer(serverFile) {
  log(`🚀 Starting server: ${serverFile}`);
  
  const serverProcess = spawn('npx', [
    'ts-node', 
    '-r', 
    'tsconfig-paths/register', 
    serverFile
  ], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  });

  let isRunning = true;
  let lastActivity = Date.now();

  // Surveiller STDERR (logs du serveur)
  serverProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    log(`📝 STDERR: ${message}`);
    lastActivity = Date.now();
    
    if (message.includes('🚀') && message.includes('running')) {
      log('✅ Server is running and ready');
    }
  });

  // Surveiller STDOUT (réponses MCP)
  serverProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    log(`📤 STDOUT: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`);
    lastActivity = Date.now();
  });

  // Surveiller les erreurs
  serverProcess.on('error', (error) => {
    log(`💥 Process Error: ${error.message}`);
    isRunning = false;
  });

  // Surveiller la sortie
  serverProcess.on('exit', (code, signal) => {
    log(`🔚 Process exited with code ${code}, signal ${signal}`);
    isRunning = false;
    
    if (code !== 0) {
      log('❌ Server crashed unexpectedly');
    } else {
      log('✅ Server shutdown cleanly');
    }
  });

  // Surveiller l'inactivité
  const inactivityCheck = setInterval(() => {
    const timeSinceActivity = Date.now() - lastActivity;
    if (timeSinceActivity > 30000) { // 30 secondes
      log(`⚠️ No activity for ${Math.round(timeSinceActivity/1000)}s`);
    }
  }, 10000);

  // Nettoyage
  const cleanup = () => {
    clearInterval(inactivityCheck);
    if (isRunning) {
      log('🛑 Stopping server...');
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (isRunning) {
          log('💀 Force killing server...');
          serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return { process: serverProcess, cleanup };
}

// Démarrer la surveillance
const serverFile = process.argv[2] || 'src/mcp-server-robust.ts';
log(`Starting monitoring for: ${serverFile}`);

const server = startServer(serverFile);

// Garder le processus en vie
process.stdin.resume(); 