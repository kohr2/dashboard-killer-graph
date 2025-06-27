import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

describe('Switch MCP Server Script', () => {
  const scriptPath = join(__dirname, '../../../../src/mcp/scripts/switch-mcp-server.sh');
  const configPath = join(process.env.HOME!, 'Library/Application Support/Claude/claude_desktop_config.json');

  beforeAll(() => {
    // Vérifier que le script existe
    expect(existsSync(scriptPath)).toBe(true);
  });

  describe('Script Help', () => {
    it('should display help when called without arguments', (done) => {
      const childProcess = spawn('bash', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
      });

      let output = '';
      childProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      childProcess.on('close', (code) => {
        expect(output).toContain('MCP Server Switcher');
        expect(output).toContain('fallback');
        expect(output).toContain('robust');
        expect(output).toContain('simple');
        done();
      });
    });

    it('should display help when called with --help', (done) => {
      const childProcess = spawn('bash', [scriptPath, '--help'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
      });

      let output = '';
      childProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      childProcess.on('close', (code) => {
        expect(output).toContain('Usage:');
        expect(output).toContain('Available servers:');
        done();
      });
    });
  });

  describe('Server Type Validation', () => {
    it('should reject invalid server types', (done) => {
      const childProcess = spawn('bash', [scriptPath, 'invalid-server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
      });

      let output = '';
      childProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      let errorOutput = '';
      childProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code) => {
        expect(code).not.toBe(0); // Should exit with error
        expect(output).toContain('Unknown server type');
        done();
      });
    });
  });

  describe('Configuration File Operations', () => {
    it('should handle missing Claude config directory', (done) => {
      // Ce test vérifie que le script peut créer le répertoire s'il n'existe pas
      const tempHome = '/tmp/test-home-' + Date.now();
      const childProcess = spawn('bash', [scriptPath, 'fallback'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../../../..'),
        env: {
          ...process.env,
          HOME: tempHome, // Répertoire temporaire
        }
      });

      let output = '';
      childProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      childProcess.on('close', (code) => {
        // Le script devrait essayer de créer le répertoire
        expect(output).toContain('Switching to Fallback Server');
        done();
      });
    });
  });

  describe('Server Configuration Templates', () => {
    it('should have valid fallback configuration template', () => {
      const fallbackConfigPath = join(__dirname, '../../../../src/mcp/config/claude_desktop_config_fallback.json');
      expect(existsSync(fallbackConfigPath)).toBe(true);

      const config = JSON.parse(readFileSync(fallbackConfigPath, 'utf8'));
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['llm-orchestrator']).toBeDefined();
      expect(config.mcpServers['llm-orchestrator'].command).toBe('npx');
      expect(config.mcpServers['llm-orchestrator'].args).toContain('ts-node');
    });

    it('should have valid robust configuration template', () => {
      const robustConfigPath = join(__dirname, '../../../../src/mcp/config/claude_desktop_config_robust.json');
      expect(existsSync(robustConfigPath)).toBe(true);

      const config = JSON.parse(readFileSync(robustConfigPath, 'utf8'));
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['llm-orchestrator']).toBeDefined();
      expect(config.mcpServers['llm-orchestrator'].args).toContain('-r');
      expect(config.mcpServers['llm-orchestrator'].args).toContain('tsconfig-paths/register');
    });

    it('should have valid simple configuration template', () => {
      const simpleConfigPath = join(__dirname, '../../../../src/mcp/config/claude_desktop_config_simple.json');
      expect(existsSync(simpleConfigPath)).toBe(true);

      const config = JSON.parse(readFileSync(simpleConfigPath, 'utf8'));
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['llm-orchestrator']).toBeDefined();
      expect(config.mcpServers['llm-orchestrator'].command).toBe('npx');
    });
  });

  describe('Script Permissions', () => {
    it('should be executable', () => {
      const stats = require('fs').statSync(scriptPath);
      const isExecutable = !!(stats.mode & parseInt('111', 8));
      expect(isExecutable).toBe(true);
    });
  });
}); 