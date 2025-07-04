/**
 * Email Source - Unified email data source
 * Supports multiple email providers (IMAP, .eml files, Exchange, etc.)
 */

import { DataSource, SourceType, SourceConfig, FetchParams, HealthStatus } from '../types/data-source.interface';
import { existsSync } from 'fs';
import { logger } from '@common/utils/logger';

export interface EmailSourceConfig extends SourceConfig {
  provider: 'eml' | 'imap' | 'exchange' | 'gmail';
  directory?: string; // For .eml files
  server?: string; // For IMAP/Exchange
  credentials?: {
    username: string;
    password: string;
  };
}

export interface RawEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  headers: Record<string, string>;
  attachments?: unknown[];
}

export class EmailSource implements DataSource<RawEmail> {
  readonly id: string;
  readonly type = SourceType.EMAIL;
  readonly config: EmailSourceConfig;
  private static counter = 0;

  constructor(config: EmailSourceConfig) {
    // Generate unique ID using counter + timestamp for uniqueness
    EmailSource.counter++;
    this.id = `email-source-${Date.now()}-${EmailSource.counter}`;
    this.config = config;
  }

  async connect(): Promise<void> {
    logger.info(`📧 Connecting to email source: ${this.config.provider}`);
    // Implementation pending connection logic based on provider
  }

  async *fetch(params?: FetchParams): AsyncIterable<RawEmail> {
    logger.info(`📥 Fetching emails from ${this.config.provider}...`);
    
    // Implementation pending based on provider type
    if (this.config.provider === 'eml' && this.config.directory) {
      yield* this.fetchFromEmlFiles(this.config.directory);
    } else if (this.config.provider === 'eml' && !this.config.directory) {
      throw new Error('Directory is required for eml provider');
    } else {
      throw new Error(`Provider ${this.config.provider} not implemented yet`);
    }
  }

  async disconnect(): Promise<void> {
    logger.info(`📧 Disconnecting from email source`);
    // Implementation pending cleanup
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      // Validate configuration based on provider
      if (this.config.provider === 'eml') {
        if (!this.config.directory) {
          return {
            status: 'unhealthy',
            lastCheck: new Date(),
            message: 'Directory is required for eml provider'
          };
        }
        
        if (!existsSync(this.config.directory)) {
          return {
            status: 'unhealthy',
            lastCheck: new Date(),
            message: `Email directory not found: ${this.config.directory}`
          };
        }
      }
      
      if (this.config.provider === 'imap' || this.config.provider === 'exchange') {
        if (!this.config.server) {
          return {
            status: 'unhealthy',
            lastCheck: new Date(),
            message: `Server is required for ${this.config.provider} provider`
          };
        }
        
        if (!this.config.credentials) {
          return {
            status: 'unhealthy',
            lastCheck: new Date(),
            message: `Credentials are required for ${this.config.provider} provider`
          };
        }
      }
      
      return {
        status: 'healthy',
        lastCheck: new Date(),
        message: 'Email source is operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Fetch emails from .eml files directory
   */
  private async *fetchFromEmlFiles(directory: string): AsyncIterable<RawEmail> {
    // Implementation pending .eml file processing
    // This should replace the logic from demo-email-ingestion-spacy.ts
    logger.info(`📂 Processing .eml files from ${directory}`);
    
    // Placeholder - implement actual file processing
    yield {
      id: 'test-email-1',
      from: 'test@example.com',
      to: ['recipient@example.com'],
      subject: 'Test Email 1',
      body: 'This is a test email',
      date: new Date(),
      headers: {}
    };
    
    yield {
      id: 'test-email-2',
      from: 'test2@example.com',
      to: ['recipient2@example.com'],
      subject: 'Test Email 2',
      body: 'This is another test email',
      date: new Date(),
      headers: {}
    };
  }
}
