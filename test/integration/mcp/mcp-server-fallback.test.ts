import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

describe('MCP Fallback Server Integration', () => {
  let serverProcess: ChildProcess;
  const serverPath = join(__dirname, '../../../src/mcp/servers/mcp-server-fallback.ts');

  const sendMCPRequest = (request: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      let responseData = '';
      let hasResponded = false;

      const timeout = setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true;
          reject(new Error('Request timeout'));
        }
      }, 5000);

      const onData = (data: Buffer) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData.trim());
          if (!hasResponded && response.id === request.id) {
            hasResponded = true;
            clearTimeout(timeout);
            serverProcess.stdout?.off('data', onData);
            resolve(response);
          }
        } catch (e) {
          // Pas encore une réponse complète JSON
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    });
  };

  beforeEach((done) => {
    // Démarrer le serveur MCP
    serverProcess = spawn('npx', ['ts-node', serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: join(__dirname, '../../..'),
    });

    // Attendre que le serveur soit prêt
    const onStderr = (data: Buffer) => {
      if (data.toString().includes('🚀 Fallback MCP Server running')) {
        serverProcess.stderr?.off('data', onStderr);
        done();
      }
    };

    serverProcess.stderr?.on('data', onStderr);

    // Timeout pour éviter d'attendre indéfiniment
    setTimeout(() => {
      done();
    }, 3000);
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Server Lifecycle', () => {
    it('should start successfully', (done) => {
      expect(serverProcess.pid).toBeDefined();
      done();
    });

    it('should respond to list tools request', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 'test-list-tools'
      };

      const response = await sendMCPRequest(request);

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools).toHaveLength(2);
      
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('query');
      expect(toolNames).toContain('help');
    });
  });

  describe('Query Tool', () => {
    it('should translate "Show recent deals with Blackstone" correctly', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'query',
          arguments: {
            query: 'Show recent deals with Blackstone'
          }
        },
        id: 'test-blackstone-query'
      };

      const response = await sendMCPRequest(request);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content[0].type).toBe('text');
      
      const responseText = response.result.content[0].text;
      expect(responseText).toContain('Show recent deals with Blackstone');
      expect(responseText).toContain('show_related');
      expect(responseText).toContain('Deal');
      expect(responseText).toContain('Blackstone');
    });

    it('should translate "get all organizations data" correctly', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'query',
          arguments: {
            query: 'get all organizations data'
          }
        },
        id: 'test-organizations-query'
      };

      const response = await sendMCPRequest(request);

      expect(response.result).toBeDefined();
      const responseText = response.result.content[0].text;
      expect(responseText).toContain('get all organizations data');
      expect(responseText).toContain('show');
      expect(responseText).toContain('Organization');
    });

    it('should handle invalid query parameter', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'query',
          arguments: {
            query: 123 // Invalid type
          }
        },
        id: 'test-invalid-query'
      };

      try {
        await sendMCPRequest(request);
        fail('Should have thrown an error');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it('should handle empty query', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'query',
          arguments: {
            query: ''
          }
        },
        id: 'test-empty-query'
      };

      const response = await sendMCPRequest(request);
      
      expect(response.result).toBeDefined();
      const responseText = response.result.content[0].text;
      expect(responseText).toContain('Error processing query');
    });
  });

  describe('Help Tool', () => {
    it('should provide general help', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'help',
          arguments: {}
        },
        id: 'test-help-general'
      };

      const response = await sendMCPRequest(request);

      expect(response.result).toBeDefined();
      const responseText = response.result.content[0].text;
      expect(responseText).toContain('MCP Server Help');
      expect(responseText).toContain('Fallback Mode');
      expect(responseText).toContain('query');
      expect(responseText).toContain('help');
    });

    it('should provide status information', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'help',
          arguments: {
            topic: 'status'
          }
        },
        id: 'test-help-status'
      };

      const response = await sendMCPRequest(request);

      expect(response.result).toBeDefined();
      const responseText = response.result.content[0].text;
      expect(responseText).toContain('Server Status Report');
      expect(responseText).toContain('Fallback');
      expect(responseText).toContain('Basic Only');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool calls', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'unknown-tool',
          arguments: {}
        },
        id: 'test-unknown-tool'
      };

      try {
        await sendMCPRequest(request);
        fail('Should have thrown an error');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should respond to queries within reasonable time', async () => {
      const startTime = Date.now();
      
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'query',
          arguments: {
            query: 'Show recent deals with Blackstone'
          }
        },
        id: 'test-performance'
      };

      await sendMCPRequest(request);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Moins de 2 secondes
    });
  });
}); 