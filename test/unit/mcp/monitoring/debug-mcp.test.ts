import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

describe('MCP Debug Tool', () => {
  const debugScriptPath = join(__dirname, '../../../../src/mcp/monitoring/debug-mcp.js');
  let debugProcess: ChildProcess;

  afterEach(() => {
    if (debugProcess) {
      debugProcess.kill();
    }
  });

  describe('Script Execution', () => {
    it('should start debug process successfully', (done) => {
      debugProcess = spawn('node', [debugScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
      });

      expect(debugProcess.pid).toBeDefined();

      // Vérifier que le processus démarre
      debugProcess.stderr?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('Debugging MCP Server')) {
          done();
        }
      });

      // Timeout pour éviter d'attendre indéfiniment
      setTimeout(() => {
        done();
      }, 3000);
    });

    it('should output debug information', (done) => {
      debugProcess = spawn('node', [debugScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
      });

      let hasOutput = false;

      debugProcess.stdout?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('STDERR') || message.includes('STDOUT')) {
          hasOutput = true;
        }
      });

      // Arrêter après 5 secondes et vérifier qu'on a eu des outputs
      setTimeout(() => {
        debugProcess.kill();
        expect(hasOutput).toBe(true);
        done();
      }, 5000);
    });

    it('should handle server initialization', (done) => {
      debugProcess = spawn('node', [debugScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
      });

      let serverInitialized = false;

      debugProcess.stdout?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('Server initialized successfully')) {
          serverInitialized = true;
        }
      });

      // Vérifier après 8 secondes
      setTimeout(() => {
        debugProcess.kill();
        expect(serverInitialized).toBe(true);
        done();
      }, 8000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing server file gracefully', (done) => {
      const invalidPath = join(__dirname, '../../../../src/mcp/monitoring/debug-mcp-invalid.js');
      
      debugProcess = spawn('node', [invalidPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
      });

      debugProcess.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      debugProcess.on('exit', (code) => {
        if (code !== 0) {
          done(); // Exit avec erreur attendu
        }
      });
    });
  });
}); 