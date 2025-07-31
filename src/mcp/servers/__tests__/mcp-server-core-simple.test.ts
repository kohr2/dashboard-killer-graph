import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getServerInfo, mcpUser } from '../mcp-server-core';

describe('MCP Server Core - Simple Functions', () => {
  describe('getServerInfo', () => {
    it('should return server information', () => {
      const result = getServerInfo();
      expect(result).toHaveProperty('server');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('activeOntologies');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('mcpUser', () => {
    it('should have correct user structure', () => {
      expect(mcpUser).toHaveProperty('id');
      expect(mcpUser).toHaveProperty('username');
      expect(mcpUser).toHaveProperty('roles');
      expect(mcpUser.id).toBe('mcp-server-user');
      expect(mcpUser.username).toBe('mcp-server');
    });
  });
}); 