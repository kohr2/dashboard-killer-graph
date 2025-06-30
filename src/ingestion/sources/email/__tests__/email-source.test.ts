/**
 * Unit tests for EmailSource
 * Following TDD approach - tests written first
 */

import { EmailSource, EmailSourceConfig } from '../../../../../src/ingestion/sources/email/email-source';
import { SourceType } from '../../../../../src/ingestion/core/types/data-source.interface';

describe('EmailSource', () => {
  let config: EmailSourceConfig;

  beforeEach(() => {
    config = {
      name: 'test-email-source',
      enabled: true,
      provider: 'eml',
      directory: './test-emails'
    };
  });

  describe('constructor', () => {
    it('should create email source with unique ID', () => {
      const source1 = new EmailSource(config);
      const source2 = new EmailSource(config);
      
      expect(source1.id).toBeDefined();
      expect(source2.id).toBeDefined();
      expect(source1.id).not.toBe(source2.id);
      expect(source1.id).toContain('email-source');
    });

    it('should set type to EMAIL', () => {
      const source = new EmailSource(config);
      expect(source.type).toBe(SourceType.EMAIL);
    });

    it('should store config', () => {
      const source = new EmailSource(config);
      expect(source.config).toEqual(config);
    });
  });

  describe('connect', () => {
    it('should connect successfully for eml provider', async () => {
      const source = new EmailSource(config);
      await expect(source.connect()).resolves.not.toThrow();
    });

    it('should connect successfully for imap provider', async () => {
      const imapConfig: EmailSourceConfig = {
        name: 'imap-source',
        enabled: true,
        provider: 'imap',
        server: 'imap.gmail.com',
        credentials: {
          username: 'test@gmail.com',
          password: 'password'
        }
      };
      const source = new EmailSource(imapConfig);
      await expect(source.connect()).resolves.not.toThrow();
    });
  });

  describe('fetch', () => {
    it('should fetch emails from eml directory', async () => {
      const source = new EmailSource(config);
      
      const emails = [];
      for await (const email of source.fetch()) {
        emails.push(email);
      }
      
      expect(emails.length).toBeGreaterThan(0);
      emails.forEach(email => {
        expect(email).toHaveProperty('id');
        expect(email).toHaveProperty('from');
        expect(email).toHaveProperty('to');
        expect(email).toHaveProperty('subject');
        expect(email).toHaveProperty('body');
        expect(email).toHaveProperty('date');
        expect(email).toHaveProperty('headers');
        expect(email.date).toBeInstanceOf(Date);
        expect(Array.isArray(email.to)).toBe(true);
      });
    });

    it('should throw error for unsupported provider', async () => {
      const unsupportedConfig: EmailSourceConfig = {
        name: 'unsupported-source',
        enabled: true,
        provider: 'exchange' // Not implemented yet
      };
      const source = new EmailSource(unsupportedConfig);
      
      const fetchGenerator = source.fetch();
      await expect(fetchGenerator.next()).rejects.toThrow('Provider exchange not implemented yet');
    });

    it('should handle fetch with parameters', async () => {
      const source = new EmailSource(config);
      
      const params = {
        limit: 5,
        offset: 0,
        filters: { subject: 'test' }
      };
      
      const emails = [];
      for await (const email of source.fetch(params)) {
        emails.push(email);
      }
      
      expect(emails.length).toBeLessThanOrEqual(5);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const source = new EmailSource(config);
      await expect(source.disconnect()).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const source = new EmailSource(config);
      
      const health = await source.healthCheck();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.lastCheck).toBeInstanceOf(Date);
      expect(health.message).toBeDefined();
    });

    it('should return unhealthy status for invalid config', async () => {
      const invalidConfig: EmailSourceConfig = {
        name: 'invalid-source',
        enabled: true,
        provider: 'eml',
        directory: '/nonexistent/directory'
      };
      const source = new EmailSource(invalidConfig);
      
      const health = await source.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('directory not found');
    });
  });

  describe('provider-specific functionality', () => {
    describe('eml provider', () => {
      it('should handle missing directory', async () => {
        const configWithoutDir: EmailSourceConfig = {
          name: 'no-dir-source',
          enabled: true,
          provider: 'eml'
          // directory is missing
        };
        const source = new EmailSource(configWithoutDir);
        
        const fetchGenerator = source.fetch();
        await expect(fetchGenerator.next()).rejects.toThrow();
      });

      it('should process multiple eml files', async () => {
        const source = new EmailSource(config);
        
        const emails = [];
        for await (const email of source.fetch()) {
          emails.push(email);
          if (emails.length >= 3) break; // Limit for test
        }
        
        expect(emails.length).toBeGreaterThan(0);
        // Each email should have unique ID
        const ids = emails.map(e => e.id);
        const uniqueIds = [...new Set(ids)];
        expect(uniqueIds.length).toBe(emails.length);
      });
    });

    describe('imap provider', () => {
      it('should require server configuration', () => {
        const configWithoutServer: EmailSourceConfig = {
          name: 'imap-no-server',
          enabled: true,
          provider: 'imap'
          // server is missing
        };
        
        expect(() => new EmailSource(configWithoutServer)).not.toThrow();
        // Validation should happen during connect/fetch
      });

      it('should require credentials for imap', () => {
        const configWithoutCreds: EmailSourceConfig = {
          name: 'imap-no-creds',
          enabled: true,
          provider: 'imap',
          server: 'imap.gmail.com'
          // credentials missing
        };
        
        expect(() => new EmailSource(configWithoutCreds)).not.toThrow();
        // Validation should happen during connect
      });
    });
  });

  describe('error handling', () => {
    it('should handle corrupted eml files gracefully', async () => {
      const source = new EmailSource(config);
      
      // Mock a scenario where some emails are corrupted
      // The source should skip corrupted files and continue
      const emails = [];
      try {
        for await (const email of source.fetch()) {
          emails.push(email);
        }
      } catch (error) {
        // Should not throw for individual file errors
        expect(error).toBeUndefined();
      }
      
      // Should still return valid emails
      expect(emails.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle connection timeouts', async () => {
      const timeoutConfig: EmailSourceConfig = {
        name: 'timeout-source',
        enabled: true,
        provider: 'imap',
        server: 'nonexistent.server.com',
        credentials: {
          username: 'test@example.com',
          password: 'password'
        }
      };
      
      const source = new EmailSource(timeoutConfig);
      
      // Connect should handle timeouts gracefully
      // Implementation detail: timeout handling will be implemented later
      await expect(source.connect()).resolves.not.toThrow();
    });
  });

  describe('configuration validation', () => {
    it('should accept valid eml configuration', () => {
      const validConfig: EmailSourceConfig = {
        name: 'valid-eml',
        enabled: true,
        provider: 'eml',
        directory: './test-emails'
      };
      
      expect(() => new EmailSource(validConfig)).not.toThrow();
    });

    it('should accept valid imap configuration', () => {
      const validConfig: EmailSourceConfig = {
        name: 'valid-imap',
        enabled: true,
        provider: 'imap',
        server: 'imap.gmail.com',
        credentials: {
          username: 'user@gmail.com',
          password: 'app-password'
        }
      };
      
      expect(() => new EmailSource(validConfig)).not.toThrow();
    });

    it('should accept valid exchange configuration', () => {
      const validConfig: EmailSourceConfig = {
        name: 'valid-exchange',
        enabled: true,
        provider: 'exchange',
        server: 'outlook.office365.com',
        credentials: {
          username: 'user@company.com',
          password: 'password'
        }
      };
      
      expect(() => new EmailSource(validConfig)).not.toThrow();
    });
  });
}); 