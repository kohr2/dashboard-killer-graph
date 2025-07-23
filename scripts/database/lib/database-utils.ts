#!/usr/bin/env ts-node

import 'reflect-metadata';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';

config(); // Load environment variables

/**
 * Shared utilities for database operations
 * Provides common functionality used across database scripts
 */
export class DatabaseUtils {
  private static instance: DatabaseUtils;
  private driver: Driver | null = null;
  private readonly uri: string;
  private readonly user: string;
  private readonly pass: string;
  private database: string;

  private constructor() {
    this.uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    this.user = process.env.NEO4J_USERNAME || 'neo4j';
    this.pass = process.env.NEO4J_PASSWORD || 'dashboard-killer';
    this.database = process.env.NEO4J_DATABASE || 'neo4j';
  }

  public static getInstance(): DatabaseUtils {
    if (!DatabaseUtils.instance) {
      DatabaseUtils.instance = new DatabaseUtils();
    }
    return DatabaseUtils.instance;
  }

  /**
   * Get a database connection with proper error handling
   */
  public async getConnection(databaseName?: string): Promise<Driver> {
    if (databaseName) {
      this.database = databaseName;
    }

    if (!this.driver) {
      try {
        this.driver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.pass));
        await this.driver.verifyConnectivity();
        console.log(`Connected to database: ${this.database}`);
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
      }
    }

    return this.driver;
  }

  /**
   * Close the database connection
   */
  public async closeConnection(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('Database connection closed');
    }
  }

  /**
   * Execute a database operation with proper error handling
   */
  public async executeWithSession<T>(
    operation: (session: Session) => Promise<T>,
    databaseName?: string
  ): Promise<T> {
    const driver = await this.getConnection(databaseName);
    const targetDatabase = databaseName || this.database;
    const session = driver.session({ database: targetDatabase });
    
    try {
      const result = await operation(session);
      return result;
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Reset a database (clear all data)
   */
  public async resetDatabase(databaseName?: string): Promise<void> {
    console.log(`Resetting database: ${databaseName || 'default'}`);
    
    await this.executeWithSession(async (session) => {
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('Database reset completed');
    }, databaseName);
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(databaseName?: string): Promise<{
    nodeCount: number;
    relationshipCount: number;
    labels: string[];
  }> {
    return await this.executeWithSession(async (session) => {
      const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as count');
      const relationshipCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
      const labelsResult = await session.run('CALL db.labels() YIELD label RETURN collect(label) as labels');

      return {
        nodeCount: nodeCountResult.records[0].get('count').toNumber(),
        relationshipCount: relationshipCountResult.records[0].get('count').toNumber(),
        labels: labelsResult.records[0].get('labels')
      };
    }, databaseName);
  }

  /**
   * List all databases
   */
  public async listDatabases(): Promise<string[]> {
    const driver = await this.getConnection();
    const session = driver.session({ database: 'system' });
    try {
      const result = await session.run('SHOW DATABASES YIELD name');
      return result.records.map(record => record.get('name'));
    } finally {
      await session.close();
    }
  }

  /**
   * Create a new database
   */
  public async createDatabase(databaseName: string): Promise<void> {
    console.log(`Creating database: ${databaseName}`);
    
    try {
      const driver = await this.getConnection();
      const session = driver.session({ database: 'system' });
      
      // Check if database exists
      const result = await session.run(
        'SHOW DATABASES YIELD name WHERE name = $name',
        { name: databaseName }
      );

      if (result.records.length === 0) {
        await session.run(`CREATE DATABASE \`${databaseName}\``);
        console.log(`Database ${databaseName} created successfully`);
      } else {
        console.log(`Database ${databaseName} already exists`);
      }
      
      await session.close();
    } catch (error) {
      console.error(`Failed to create database ${databaseName}:`, error);
      throw error;
    }
  }

  /**
   * Drop a database
   */
  public async dropDatabase(databaseName: string): Promise<void> {
    if (databaseName === 'neo4j' || databaseName === 'system') {
      throw new Error('Cannot drop system databases (neo4j, system)');
    }

    console.log(`Dropping database: ${databaseName}`);
    
    try {
      const driver = await this.getConnection();
      const session = driver.session({ database: 'system' });
      await session.run(`DROP DATABASE \`${databaseName}\` IF EXISTS`);
      await session.close();
      console.log(`Database ${databaseName} dropped successfully`);
    } catch (error) {
      console.error(`Failed to drop database ${databaseName}:`, error);
      throw error;
    }
  }

  /**
   * Initialize database schema
   */
  public async initializeSchema(databaseName?: string): Promise<void> {
    console.log('Initializing database schema...');
    
    // For now, just create basic indexes
    await this.executeWithSession(async (session) => {
      // Create index on id property for all nodes
      await session.run('CREATE INDEX id_index IF NOT EXISTS FOR (n) ON (n.id)');
      
      // Create index on name property for all nodes
      await session.run('CREATE INDEX name_index IF NOT EXISTS FOR (n) ON (n.name)');
      
      console.log('Schema initialization completed');
    }, databaseName);
  }

  /**
   * Clean up unused database labels
   */
  public async cleanupLabels(databaseName?: string): Promise<void> {
    console.log('🚀 Starting database label cleanup...');
    console.log('⚠️ Label cleanup requires ontology service - use cleanup-db-labels.ts for now');
    console.log('✅ Label cleanup placeholder - use the dedicated cleanup-db-labels.ts script');
  }

  /**
   * Build graph from extraction report
   */
  public async buildGraph(databaseName?: string, reportPath?: string): Promise<void> {
    console.log('🚀 Starting graph building from extraction report...');

    const defaultReportPath = join(__dirname, '..', '..', 'hybrid-extraction-report.json');
    const finalReportPath = reportPath || defaultReportPath;

    try {
      const { readFileSync } = await import('fs');
      const report = JSON.parse(readFileSync(finalReportPath, 'utf-8'));

      await this.executeWithSession(async (session) => {
        console.log('Clearing existing graph data...');
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('Graph data cleared.');

        const BATCH_SIZE = 100;
        const transformedNodes = report.nodes.map((node: any) => {
          // Transform node properties
          if (node.properties && node.properties.value) {
            node.properties.name = node.properties.value;
            delete node.properties.value;
          }
          if (node.properties && node.properties.type) {
            delete node.properties.type;
          }
          return node;
        });

        // Batch process nodes
        console.log(`Processing ${transformedNodes.length} nodes in batches of ${BATCH_SIZE}...`);
        for (let i = 0; i < transformedNodes.length; i += BATCH_SIZE) {
          const batch = transformedNodes.slice(i, i + BATCH_SIZE);
          console.log(` -> Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
        
          const transaction = session.beginTransaction();
          try {
            for (const node of batch) {
              const properties = node.properties || {};
              const labels = (node.labels && node.labels.length > 0) ? node.labels : ['Unknown'];

              // Create node with labels and properties
              const labelString = labels.map((l: string) => `:\`${l}\``).join('');
              const propertiesString = Object.keys(properties)
                .map(key => `${key}: $${key}`)
                .join(', ');
              
              const createQuery = `CREATE (n${labelString} {${propertiesString}})`;
              await transaction.run(createQuery, properties);
            }
            await transaction.commit();
          } catch (error) {
            await transaction.rollback();
            throw error;
          }
        }

        // Process relationships
        console.log(`Processing ${report.relationships.length} relationships...`);
        for (const rel of report.relationships) {
          const propertiesString = Object.keys(rel.properties || {})
            .map(key => `${key}: $${key}`)
            .join(', ');
          
          const createRelQuery = `
            MATCH (source {id: $sourceId})
            MATCH (target {id: $targetId})
            CREATE (source)-[r:\`${rel.type}\` {${propertiesString}}]->(target)
          `;
          
          await session.run(createRelQuery, {
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            ...rel.properties
          });
        }

        console.log('✅ Graph building completed successfully');
      }, databaseName);
    } catch (error) {
      console.error('❌ Failed to build graph:', error);
      throw error;
    }
  }

  /**
   * Ingest emails into database
   */
  public async ingestEmails(databaseName?: string, emailsDir?: string): Promise<void> {
    console.log('🚀 Starting email ingestion...');

    const defaultEmailsDir = join(__dirname, '..', '..', 'test-emails');
    const finalEmailsDir = emailsDir || defaultEmailsDir;

    try {
      console.log('📂 Email ingestion requires EmailProcessingService - use run-neo4j-ingestion.ts for now');
      console.log(`📂 Found email directory: ${finalEmailsDir}`);
      
      const emailFiles = readdirSync(finalEmailsDir).filter(f => f.endsWith('.eml'));
      console.log(`📂 Found ${emailFiles.length} email files to process...`);
      console.log('⚠️ Email ingestion not fully implemented in unified script yet');

    } catch (error) {
      console.error('❌ Failed to ingest emails:', error);
      throw error;
    }
  }

  /**
   * Optimize database performance
   */
  public async optimizeDatabase(databaseName?: string): Promise<void> {
    console.log('🚀 Starting database optimization...');

    await this.executeWithSession(async (session) => {
      // Create indexes for better performance
      console.log('Creating performance indexes...');
      
      // Create index on id property for all nodes
      await session.run('CREATE INDEX id_index IF NOT EXISTS FOR (n) ON (n.id)');
      
      // Create index on name property for all nodes
      await session.run('CREATE INDEX name_index IF NOT EXISTS FOR (n) ON (n.name)');
      
      // Create index on type property for all nodes
      await session.run('CREATE INDEX type_index IF NOT EXISTS FOR (n) ON (n.type)');

      console.log('✅ Database optimization completed');
    }, databaseName);
  }
}

/**
 * Convenience function to get database utils instance
 */
export function getDatabaseUtils(): DatabaseUtils {
  return DatabaseUtils.getInstance();
} 